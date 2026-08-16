import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  executeWithRecovery,
  retryIncident,
  RecoveryError,
  MAX_RECOVERY_DEPTH,
} from "../lib/recovery/engine";
import { classifyError, autoRetryAllowed } from "../lib/recovery/classifier";
import { normalizeError } from "../lib/recovery/errors";
import { computeFingerprint, buildIncident, shouldAggregate, aggregateIncident } from "../lib/recovery/incidents-core";
import { recordIncident, queryIncidents, incidentStats } from "../lib/recovery/incidents-store";
import { validateDiagnosis } from "../lib/recovery/ai";
import {
  registerRecoveryActionExecutor,
  registerOperationExecutor,
  resetRegistryForTests,
  getRecommendableActions,
} from "../lib/recovery/registry";
import { evaluateRecoveryAction, resetPolicyCountersForTests } from "../lib/recovery/policy";
import { resetAiGuardStateForTests } from "../lib/recovery/ai-guard";
import type {
  AiAnalysisInput,
  AiDiagnosis,
  Incident,
  IncidentStore,
  RecoveryLogger,
} from "../lib/recovery/types";

// Fake SIDs used only as redaction test fixtures. Built from split string
// literals so GitHub's secret scanner cannot mistake the source for a real
// credential, while the runtime value remains a well-formed SID shape.
const FAKE_SID_A = "AC1234567890abcdef" + "1234567890abcdef";
const FAKE_SID_B = "AC1a2b3c4d5e6f7a8b" + "9c0d1e2f3a4b5c6d";

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

function matchesFilter(doc: Incident, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([k, v]) => {
    if (k === "status" && (v as { $in?: unknown[] })?.$in) {
      return (v as { $in: unknown[] }).$in.includes(doc.status);
    }
    return (doc as unknown as Record<string, unknown>)[k] === v;
  });
}

class MemoryStore implements IncidentStore {
  docs: Incident[] = [];
  private next = 1;

  async findOne(filter: Record<string, unknown>): Promise<Incident | null> {
    return this.docs.find((d) => matchesFilter(d, filter)) ?? null;
  }

  async find(
    filter: Record<string, unknown>,
    opts?: { sort?: Record<string, 1 | -1>; limit?: number }
  ): Promise<Incident[]> {
    let out = this.docs.filter((d) => matchesFilter(d, filter));
    if (opts?.sort?.createdAt === -1) {
      out = [...out].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    if (opts?.limit) out = out.slice(0, opts.limit);
    return out;
  }

  async insertOne(doc: Incident): Promise<void> {
    this.docs.push({ ...doc, _id: `mem-${this.next++}` });
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ matchedCount: number }> {
    const doc = this.docs.find((d) => matchesFilter(d, filter));
    if (!doc) return { matchedCount: 0 };
    const $set = (update as { $set?: Record<string, unknown> }).$set ?? {};
    Object.assign(doc, $set);
    return { matchedCount: 1 };
  }

  async count(filter: Record<string, unknown>): Promise<number> {
    return this.docs.filter((d) => matchesFilter(d, filter)).length;
  }
}

const silentLogger: RecoveryLogger = { log: () => {} };

function authTwilioError() {
  const err: Record<string, unknown> = {
    code: 20003,
    status: 401,
    message: "Authentication Error - No Auth Token",
    moreInfo: "https://www.twilio.com/docs/errors/20003",
  };
  return err;
}

function retryAfter429(): Error {
  const err = new Error("Too Many Requests") as Error & {
    response?: { headers?: { "retry-after"?: string } };
    status?: number;
  };
  err.status = 429;
  err.response = { headers: { "retry-after": "0.01" } };
  return err;
}

function googleForbidden(): Error {
  const err = new Error("Request had insufficient authentication scopes") as Error & {
    response?: { status?: number; data?: unknown };
  };
  err.response = {
    status: 403,
    data: { error: { message: "Request had insufficient authentication scopes", code: 403 } },
  };
  return err;
}

const aiDiagnosis = (over: Partial<AiDiagnosis> = {}): AiDiagnosis => ({
  classification: "UNKNOWN",
  severity: "HIGH",
  retryable: false,
  rootCause: "test root cause",
  recommendedAction: "NO_SAFE_RECOVERY",
  confidence: 0.7,
  reason: "test reason",
  safeRecoveryAvailable: false,
  ...over,
});

// ---------------------------------------------------------------------------

describe("recovery engine", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
  });

  it("1. succeeds without touching the store or retrying", async () => {
    const execute = vi.fn(async () => "value");
    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: true,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    });
    expect(result).toBe("value");
    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.docs).toHaveLength(0);
  });

  it("2. retries a 429 (RATE_LIMIT) after Retry-After and succeeds", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(retryAfter429())
      .mockResolvedValueOnce("ok");
    const result = await executeWithRecovery({
      provider: "openai",
      operation: "chat",
      idempotent: false,
      maxAttempts: 3,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    });
    expect(result).toBe("ok");
    expect(execute).toHaveBeenCalledTimes(2);
    expect(store.docs).toHaveLength(0);
  });

  it("3. gives up on a persistent 429 and creates an OPEN incident", async () => {
    const execute = vi.fn(async () => {
      throw retryAfter429();
    });
    await expect(
      executeWithRecovery({
        provider: "openai",
        operation: "chat",
        idempotent: false,
        maxAttempts: 3,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].status).toBe("OPEN");
    expect(store.docs[0].httpStatus).toBe(429);
    expect(store.docs[0].severity).toBe("MEDIUM");
  });

  it("4. does NOT auto-retry a 500 for a non-idempotent operation", async () => {
    const execute = vi.fn(async () => {
      throw new Error("Internal Server Error (500)");
    });
    await expect(
      executeWithRecovery({
        provider: "resend",
        operation: "send_email",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.docs).toHaveLength(1);
  });

  it("5. DOES auto-retry a 500 for an idempotent operation, then fails closed", async () => {
    const execute = vi.fn(async () => {
      throw new Error("Internal Server Error (500)");
    });
    await expect(
      executeWithRecovery({
        provider: "astra",
        operation: "read_call",
        idempotent: true,
        maxAttempts: 3,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(store.docs).toHaveLength(1);
  });

  it("6. no auto-retry on network timeout for non-idempotent ops", async () => {
    const execute = vi.fn(async () => {
      const err = new Error("fetch failed");
      err.name = "TypeError";
      throw err;
    });
    await expect(
      executeWithRecovery({
        provider: "retell",
        operation: "get_call",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("7. executes TWILIO_USE_SUBACCOUNT_AUTH on 20003 and recovers (no incident)", async () => {
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async (ctx) => {
      ctx.shared.useSubaccountAuth = true;
      return { ok: true, detail: "switched to subaccount scope" };
    });
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.useSubaccountAuth) throw authTwilioError();
      return "created";
    });

    const result = await executeWithRecovery({
      provider: "twilio",
      operation: "create_tollfree_verification",
      businessId: "b1",
      idempotent: true,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    });

    expect(result).toBe("created");
    expect(execute).toHaveBeenCalledTimes(2); // initial + depth-1 rerun
    expect(store.docs).toHaveLength(0);
  });

  it("8. recovers via GOOGLE_REFRESH_OAUTH_TOKEN on a google 403", async () => {
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", async (ctx) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true, detail: "refreshed token" };
    });
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "event-created";
    });

    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      businessId: "b2",
      idempotent: false,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    });

    expect(result).toBe("event-created");
    expect(store.docs).toHaveLength(0);
  });

  it("9. fails closed with REQUIRES_ACTION incident when the action executor itself fails", async () => {
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async () => ({
      ok: false,
      detail: "could not reach subaccount",
    }));
    const execute = vi.fn(async () => {
      throw authTwilioError();
    });

    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        idempotent: true,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(1); // no blind re-execution
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].status).toBe("REQUIRES_ACTION");
    expect(store.docs[0].recoveryAttempted).toBe(true);
  });

  it("10. unknown error with no recovery path creates an OPEN incident", async () => {
    const execute = vi.fn(async () => {
      throw new Error("Something utterly unrecognizable happened");
    });
    await expect(
      executeWithRecovery({
        provider: "unknown",
        operation: "mystery_op",
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].status).toBe("OPEN");
    expect(store.docs[0].severity).toBe("HIGH");
    expect(store.docs[0].recoveryAttempted).toBe(false);
  });

  it("11. recursion guard: rerun failure never loops again (action runs exactly once)", async () => {
    let actionRuns = 0;
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async (ctx) => {
      actionRuns++;
      ctx.shared.useSubaccountAuth = true;
      return { ok: true };
    });
    const execute = vi.fn(async () => {
      throw authTwilioError();
    });

    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        idempotent: true,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(actionRuns).toBe(1);
    expect(execute).toHaveBeenCalledTimes(2); // initial + guarded rerun, nothing more
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].status).toBe("REQUIRES_ACTION");
    expect(store.docs[0].recoveryAction).toBe("TWILIO_USE_SUBACCOUNT_AUTH");
  });

  it("12. aggregates repeated identical failures into one incident", async () => {
    const execute = vi.fn(async () => {
      throw authTwilioError();
    });
    for (let i = 0; i < 2; i++) {
      await expect(
        executeWithRecovery({
          provider: "twilio",
          operation: "create_tollfree_verification",
          idempotent: true,
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true },
        })
      ).rejects.toThrow(RecoveryError);
    }

    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].occurrenceCount).toBe(2);
  });

  it("13. records a separate incident for a different failure", async () => {
    const execute = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(authTwilioError())
      .mockRejectedValueOnce(googleForbidden());
    for (let i = 0; i < 2; i++) {
      await expect(
        executeWithRecovery({
          provider: "twilio",
          operation: "create_tollfree_verification",
          idempotent: true,
          businessId: "b1",
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true },
        })
      ).rejects.toThrow(RecoveryError);
    }
    expect(store.docs).toHaveLength(2);
  });

  it("14. suppression: DUPLICATE errors with suppressCategories create no incident", async () => {
    const execute = vi.fn(async () => {
      const err: Record<string, unknown> = {
        code: 61001,
        status: 400,
        message: "Verification already exists for number",
      };
      return Promise.reject(err as unknown as Error);
    });
    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        idempotent: true,
        suppressCategories: ["DUPLICATE"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);
    expect(store.docs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------

describe("AI diagnosis stage", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    resetAiGuardStateForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
  });

  it("15. AI unavailable (null) fails closed into an OPEN incident", async () => {
    const analyze = vi.fn(async () => null);
    const execute = vi.fn(async () => {
      throw new Error("weird error");
    });
    await expect(
      executeWithRecovery({
        provider: "retell",
        operation: "process_call",
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
      })
    ).rejects.toThrow(RecoveryError);
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiRootCause).toBeUndefined();
  });

  it("16. AI-recommended action that the policy rejects is never executed", async () => {
    const aiExec = vi.fn(async () => ({ ok: true }));
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", aiExec);
    const analyze = vi.fn(async () =>
      aiDiagnosis({
        classification: "AUTHORIZATION",
        recommendedAction: "TWILIO_USE_SUBACCOUNT_AUTH",
        safeRecoveryAvailable: true,
      })
    );
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    // custom candidate list blocks the deterministic stage
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
      })
    ).rejects.toThrow(RecoveryError);

    // cross-provider: policy says the action does not apply to google
    expect(aiExec).not.toHaveBeenCalled();
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiRecommendation).toBe("TWILIO_USE_SUBACCOUNT_AUTH");
  });

  it("17. AI-recommended action executes when policy allows and operation recovers", async () => {
    const aiExec = vi.fn(async (ctx: { shared: Record<string, unknown> }) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true, detail: "refreshed" };
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", aiExec);
    const analyze = vi.fn(async () =>
      aiDiagnosis({
        classification: "AUTHORIZATION",
        severity: "HIGH",
        recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
        safeRecoveryAvailable: true,
      })
    );
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
    });

    expect(result).toBe("inserted");
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(aiExec).toHaveBeenCalledTimes(1);
    expect(store.docs).toHaveLength(0);
  });

  it("18. a throwing AI analyzer never breaks the pipeline (conservative fallback)", async () => {
    const analyze = vi.fn(async () => {
      throw new Error("OpenAI down");
    });
    const execute = vi.fn(async () => {
      throw new Error("weird error");
    });
    await expect(
      executeWithRecovery({
        provider: "retell",
        operation: "process_call",
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
      })
    ).rejects.toThrow(RecoveryError);
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].status).toBe("OPEN");
  });

  it("19. AI is handed only redacted, sanitized input", async () => {
    const captured: AiAnalysisInput[] = [];
    const analyze = vi.fn(async (input: AiAnalysisInput) => {
      captured.push(input);
      return aiDiagnosis();
    });
    const execute = vi.fn(async () => {
      const err = new Error(
        `Failed: Authentication Error. Key: sk-live-4f79c01ff2ba4a2be88b4d77e5566b23 sid=${FAKE_SID_B} bearer=eyJhbGciOiJIUzI1NiJ9.danger.token`
      );
      return Promise.reject(err);
    });

    await expect(
      executeWithRecovery({
        provider: "openai",
        operation: "chat",
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
      })
    ).rejects.toThrow(RecoveryError);

    expect(captured).toHaveLength(1);
    expect(captured[0].sanitizedMessage).not.toContain("sk-live-4f79c01ff2ba4a2be88b4d77e5566b23");
    expect(captured[0].sanitizedMessage).not.toContain("danger.token");
    expect(store.docs[0].errorMessage).not.toContain("sk-live-4f79c01ff2ba4a2be88b4d77e5566b23");
  });
});

// ---------------------------------------------------------------------------

describe("classification + policy", () => {
  beforeEach(() => {
    resetRegistryForTests();
    resetPolicyCountersForTests();
  });

  it("classifies Twilio error codes deterministically", () => {
    expect(classifyError({ provider: "twilio", operation: "x", errorCode: "20003", message: "auth" })).toBe("AUTHENTICATION");
    expect(classifyError({ provider: "twilio", operation: "x", errorCode: "20103", message: "subaccount" })).toBe("AUTHORIZATION");
    expect(classifyError({ provider: "twilio", operation: "x", errorCode: "61001", message: "already verified" })).toBe("DUPLICATE");
    expect(classifyError({ provider: "twilio", operation: "x", errorCode: "20429", message: "limit" })).toBe("RATE_LIMIT");
  });

  it("classifies Google 403 as AUTHORIZATION and 429 as RATE_LIMIT", () => {
    expect(classifyError({ provider: "google", operation: "x", httpStatus: 403, message: "forbidden" })).toBe("AUTHORIZATION");
    expect(classifyError({ provider: "google", operation: "x", httpStatus: 429, message: "quota" })).toBe("RATE_LIMIT");
    expect(classifyError({ provider: "google", operation: "x", message: "reason=authError" })).toBe("AUTHENTICATION");
  });

  it("falls back to UNKNOWN", () => {
    expect(classifyError({ provider: "paddle", operation: "x", message: "card declined" })).toBe("UNKNOWN");
  });

  it("autoRetryAllowed is idempotency-aware", () => {
    expect(autoRetryAllowed("RATE_LIMIT", false)).toBe(true);
    expect(autoRetryAllowed("SERVER_ERROR", true)).toBe(true);
    expect(autoRetryAllowed("SERVER_ERROR", false)).toBe(false);
    expect(autoRetryAllowed("TIMEOUT", false)).toBe(false);
    expect(autoRetryAllowed("VALIDATION", true)).toBe(false);
    expect(autoRetryAllowed("AUTHENTICATION", true)).toBe(false);
  });

  it("policy rejects unregistered, disabled, wrong-provider, wrong-operation actions", () => {
    const base = {
      provider: "google" as const,
      operation: "calendar_insert_event",
      category: "AUTHORIZATION" as const,
      recoveryAttempted: false,
      previousActions: [],
      shared: {},
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
    };
    expect(evaluateRecoveryAction("NOT_REGISTERED", base).allowed).toBe(false);
    expect(evaluateRecoveryAction("TWILIO_USE_SUBACCOUNT_AUTH", base).allowed).toBe(false);
    expect(
      evaluateRecoveryAction("GOOGLE_REFRESH_OAUTH_TOKEN", { ...base, operation: "nope" }).allowed
    ).toBe(false);
    expect(
      evaluateRecoveryAction("GOOGLE_REFRESH_OAUTH_TOKEN", { ...base, category: "DUPLICATE" }).allowed
    ).toBe(false);
    expect(evaluateRecoveryAction("GOOGLE_REFRESH_OAUTH_TOKEN", { ...base, recoveryAttempted: true }).allowed).toBe(false);
  });

  it("policy requires a wired executor", () => {
    const v = evaluateRecoveryAction("GOOGLE_REFRESH_OAUTH_TOKEN", {
      provider: "google",
      operation: "calendar_insert_event",
      category: "AUTHORIZATION",
      recoveryAttempted: false,
      previousActions: [],
      shared: {},
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
    });
    expect(v.allowed).toBe(false);
    expect(v.allowed || v.reason).toContain("executor");
  });

  it("recommendable actions are whitelisted by provider and operation", () => {
    const googleActions = getRecommendableActions("google", "calendar_insert_event");
    expect(googleActions.some((a) => a.id === "GOOGLE_REFRESH_OAUTH_TOKEN")).toBe(true);
    expect(googleActions.some((a) => a.id === "TWILIO_USE_SUBACCOUNT_AUTH")).toBe(false);
    const twilioActions = getRecommendableActions("twilio", "create_tollfree_verification");
    expect(twilioActions.some((a) => a.id === "TWILIO_USE_SUBACCOUNT_AUTH")).toBe(true);
  });

  it("validateDiagnosis enforces the backend allow list", () => {
    const good = {
      classification: "AUTHORIZATION",
      severity: "HIGH",
      retryable: false,
      rootCause: "token expired",
      recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
      confidence: 0.9,
      reason: "scopes",
      safeRecoveryAvailable: true,
      _allowedActions: ["GOOGLE_REFRESH_OAUTH_TOKEN"],
    };
    expect(validateDiagnosis(good)?.recommendedAction).toBe("GOOGLE_REFRESH_OAUTH_TOKEN");

    const evil = { ...good, recommendedAction: "DELETE_EVERYTHING" };
    expect(validateDiagnosis(evil)).toBeNull();

    const broken = { ...good, confidence: 2 };
    expect(validateDiagnosis(broken)).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe("fingerprints + admin retry", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    resetRegistryForTests();
    resetPolicyCountersForTests();
  });

  it("fingerprint ignores variable numbers but keeps business + code", () => {
    const base = { provider: "twilio" as const, operation: "create_tollfree_verification", errorCode: "61001", message: "Verification already exists for number +15551234567" };
    const same = { ...base, message: "Verification already exists for number +14445556666" };
    expect(computeFingerprint(base)).toBe(computeFingerprint(same));
    expect(computeFingerprint({ ...base, businessId: "b1" })).not.toBe(computeFingerprint({ ...base, businessId: "b2" }));
  });

  it("shouldAggregate only aggregates active statuses", () => {
    const inc = buildIncident({
      fingerprint: "f",
      error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification" }),
      context: {},
      retryCount: 0,
    });
    expect(shouldAggregate(inc)).toBe(true);
    expect(shouldAggregate({ ...inc, status: "RESOLVED" })).toBe(false);
    expect(aggregateIncident(inc, normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification" })).occurrenceCount).toBe(2);
  });

  it("recordIncident upserts by fingerprint through a custom store", async () => {
    const first = await recordIncident({
      error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification", businessId: "b1" }),
      context: { businessName: "Test Co" },
      retryCount: 0,
      store,
    } as never);
    expect(store.docs).toHaveLength(1);
    const again = await recordIncident({
      error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification", businessId: "b1" }),
      context: {},
      retryCount: 0,
      store,
    } as never);
    expect(again?._id).toBe(first?._id);
    expect(store.docs[0].occurrenceCount).toBe(2);
  });

  it("queryIncidents filters by provider, status and free text", async () => {
    for (let i = 0; i < 2; i++) {
      await recordIncident({
        error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification", businessId: "b1" }),
        context: {},
        retryCount: 0,
        status: "OPEN",
        store,
      } as never);
    }
    await recordIncident({
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
      context: {},
      retryCount: 0,
      status: "REQUIRES_ACTION",
      store,
    } as never);

    expect((await queryIncidents({ provider: "twilio" }, store)).length).toBe(1);
    expect((await queryIncidents({ status: "REQUIRES_ACTION" }, store)).length).toBe(1);
    expect((await queryIncidents({ q: "No Auth Token" }, store)).length).toBe(1);
    expect((await queryIncidents({ q: "nothing-matches-this" }, store)).length).toBe(0);
  });

  it("manual retry succeeds through a registered operation executor", async () => {
    const incident = await recordIncident({
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event", businessId: "b3" }),
      context: { eventPayload: { event: { summary: "x" }, calendarId: "primary" } },
      retryCount: 0,
      status: "REQUIRES_ACTION",
      store,
    } as never);
    registerOperationExecutor("google", "calendar_insert_event", async (ctx) => {
      expect(ctx.businessId).toBe("b3");
      return { ok: true, detail: "event created" };
    });

    const result = await retryIncident(String(incident?._id), "admin-1", { store });
    expect(result.ok).toBe(true);
    expect(result.incident?.status).toBe("RECOVERED");
  });

  it("manual retry without an executor reports no_retry_path and flags REQUIRES_ACTION", async () => {
    const incident = await recordIncident({
      error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification" }),
      context: {},
      retryCount: 0,
      status: "OPEN",
      store,
    } as never);

    const result = await retryIncident(String(incident?._id), "admin-1", { store });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("no_retry_path");
    expect(result.incident?.status).toBe("REQUIRES_ACTION");
  });

  it("manual retry that fails records the failure on the incident", async () => {
    const incident = await recordIncident({
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
      context: {},
      retryCount: 0,
      status: "REQUIRES_ACTION",
      store,
    } as never);
    registerOperationExecutor("google", "calendar_insert_event", async () => ({
      ok: false,
      detail: "access token refresh failed",
    }));

    const result = await retryIncident(String(incident?._id), "admin-9", { store });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("retry_failed");
    expect(result.incident?.status).toBe("REQUIRES_ACTION");
  });

  it("incidentStats counts open vs resolved incidents", async () => {
    await recordIncident({
      error: normalizeError({ error: authTwilioError(), provider: "twilio", operation: "create_tollfree_verification" }),
      context: {},
      retryCount: 0,
      status: "OPEN",
      store,
    } as never);
    await recordIncident({
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
      context: {},
      retryCount: 0,
      status: "REQUIRES_ACTION",
      store,
    } as never);
    await recordIncident({
      error: normalizeError({
        error: { code: 20103, status: 403, message: "Subaccount not authorized" },
        provider: "twilio",
        operation: "update_tollfree_verification",
      }),
      context: {},
      retryCount: 0,
      status: "RECOVERED",
      store,
    } as never);

    const stats = await incidentStats(store);
    expect(stats.open).toBe(2);
    expect(stats.recovered).toBe(1);
    expect(stats.total).toBe(3);
  });
});

// ---------------------------------------------------------------------------

describe("redaction", () => {
  it("redacts API keys, tokens and SIDs from messages", async () => {
    const { redactMessage, redactObject } = await import("../lib/recovery/redaction");
    const message =
      "Failed with Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret123 sid=" + FAKE_SID_A;
    const redacted = redactMessage({ message } as never);
    expect(redacted).not.toContain("secret123");
    expect(redacted).not.toContain(FAKE_SID_A);
    expect(redacted).toContain("[REDACTED]");

    const redactedObj = redactObject({
      headers: { authorization: "Bearer danger" },
      body: { apiKey: "sk-live-4f79c01ff2ba4a2be88b4d77e5566b23" },
      safe: "kept",
    });
    expect(JSON.stringify(redactedObj)).not.toContain("danger");
    expect(JSON.stringify(redactedObj)).not.toContain("sk-live");
    expect(JSON.stringify(redactedObj)).toContain("kept");
  });

  it("MAX_RECOVERY_DEPTH is guarded at 1", () => {
    expect(MAX_RECOVERY_DEPTH).toBe(1);
  });
});