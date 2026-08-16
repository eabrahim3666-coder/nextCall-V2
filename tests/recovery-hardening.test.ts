import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { executeWithRecovery, retryIncident, RecoveryError } from "../lib/recovery/engine";
import { normalizeError, detectBusinessFailure } from "../lib/recovery/errors";
import {
  evaluateRecoveryAction,
  executeValidatedAction,
  resetPolicyCountersForTests,
} from "../lib/recovery/policy";
import { recordIncident, queryIncidents } from "../lib/recovery/incidents-store";
import {
  registerRecoveryActionExecutor,
  registerOperationExecutor,
  resetRegistryForTests,
} from "../lib/recovery/registry";
import {
  aiGuardStore,
  consumeDiagnosisBudget,
  getCachedDiagnosis,
  computeDiagnosisCacheKey,
  type AiDiagnosisCacheEntry,
  type AiBudgetRecord,
  type AiGuardStore,
} from "../lib/recovery/ai-guard";
import {
  circuitKey,
  getCircuitState,
  type CircuitBreakerStore,
  type CircuitRecord,
} from "../lib/recovery/circuit-breaker";
import { checkMemoryFallbackWarning } from "../lib/recovery/logging";

// Fake SID used only as a redaction test fixture. Built from split string
// literals so GitHub's secret scanner cannot mistake the source for a real
// credential, while the runtime value remains a well-formed SID shape.
const FAKE_SID_A = "AC1234567890abcdef" + "1234567890abcdef";
import type {
  AiAnalysisInput,
  AiDiagnosis,
  ErrorCategory,
  Incident,
  IncidentStore,
  RecoveryLogger,
} from "../lib/recovery/types";

// ---------------------------------------------------------------------------
// In-memory doubles (mirror the pattern from tests/recovery.test.ts)
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
    if (opts?.sort?.createdAt === -1) out = [...out].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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

class MemoryAiGuard implements AiGuardStore {
  budgets: AiBudgetRecord[] = [];
  cache: AiDiagnosisCacheEntry[] = [];
  budgetLookups = 0;

  async findBudget(fingerprint: string): Promise<AiBudgetRecord | null> {
    this.budgetLookups++;
    return this.budgets.find((b) => b.fingerprint === fingerprint) ?? null;
  }
  async saveBudget(record: AiBudgetRecord): Promise<void> {
    const i = this.budgets.findIndex((b) => b.fingerprint === record.fingerprint);
    if (i >= 0) this.budgets[i] = record;
    else this.budgets.push(record);
  }
  async findCache(key: string): Promise<AiDiagnosisCacheEntry | null> {
    return this.cache.find((c) => c.key === key) ?? null;
  }
  async saveCache(entry: AiDiagnosisCacheEntry): Promise<void> {
    const i = this.cache.findIndex((c) => c.key === entry.key);
    if (i >= 0) this.cache[i] = entry;
    else this.cache.push(entry);
  }
  async listCacheOldestFirst(): Promise<AiDiagnosisCacheEntry[]> {
    return [...this.cache].sort((a, b) => (a.cachedAt < b.cachedAt ? -1 : 1));
  }
  async deleteCache(key: string): Promise<void> {
    this.cache = this.cache.filter((c) => c.key !== key);
  }
}

class MemoryCircuitBreaker implements CircuitBreakerStore {
  records = new Map<string, CircuitRecord>();
  failing = false;

  async getBreaker(key: string): Promise<CircuitRecord | null> {
    if (this.failing) throw new Error("breaker storage down");
    return this.records.get(key) ?? null;
  }
  async saveBreaker(record: CircuitRecord): Promise<void> {
    if (this.failing) throw new Error("breaker storage down");
    this.records.set(record.key, record);
  }
}

const silentLogger: RecoveryLogger = { log: () => {} };

function authTwilioError() {
  return {
    code: 20003,
    status: 401,
    message: "Authentication Error - No Auth Token",
  };
}

function googleForbidden(): Error {
  const err = new Error("Request had insufficient authentication scopes") as Error & {
    response?: { status?: number; data?: unknown };
  };
  err.response = { status: 403, data: { error: { message: "insufficient scopes", code: 403 } } };
  return err;
}

function weirdError(): Error {
  return new Error("Something utterly unrecognizable happened");
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

async function googleRefreshExecutor(ctx: { shared: Record<string, unknown> }) {
  ctx.shared.forceRefreshOAuth = true;
  return { ok: true, detail: "refreshed" };
}

// ---------------------------------------------------------------------------

describe("hardening: AI diagnosis budget (H1)", () => {
  let store: MemoryStore;
  let guard: MemoryAiGuard;

  beforeEach(() => {
    store = new MemoryStore();
    guard = new MemoryAiGuard();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
    delete process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT;
    delete process.env.AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS;
    delete process.env.AI_RECOVERY_DIAGNOSIS_CACHE_TTL_SECONDS;
    delete process.env.AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    delete process.env.AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS;
  });

  it("1. budget exhaustion skips GPT, records the reason, and still creates the incident", async () => {
    process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT = "1";
    const analyze = vi.fn(async () => null);
    const execute = vi.fn(async () => {
      throw weirdError();
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        executeWithRecovery({
          provider: "retell",
          operation: "process_call",
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
        })
      ).rejects.toThrow(RecoveryError);
    }

    expect(analyze).toHaveBeenCalledTimes(1); // second occurrence never hit GPT
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiDiagnosisSkipped).toBe(true);
    expect(store.docs[0].aiDiagnosisSkipReason).toBe("budget_exhausted");
  });

  it("2. within-budget occurrences still get a fresh GPT diagnosis", async () => {
    process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT = "5";
    const analyze = vi.fn(async () => null);
    const execute = vi.fn(async () => {
      throw weirdError();
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        executeWithRecovery({
          provider: "retell",
          operation: "process_call",
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
        })
      ).rejects.toThrow(RecoveryError);
    }

    expect(analyze).toHaveBeenCalledTimes(2);
    expect(store.docs[0].aiDiagnosisSkipped).toBeUndefined();
  });

  it("3. the budget window resets and diagnosis is allowed again", async () => {
    process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT = "1";
    process.env.AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS = "0"; // every call opens a fresh window
    const analyze = vi.fn(async () => null);
    const execute = vi.fn(async () => {
      throw weirdError();
    });

    for (let i = 0; i < 2; i++) {
      await expect(
        executeWithRecovery({
          provider: "retell",
          operation: "process_call",
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
        })
      ).rejects.toThrow(RecoveryError);
    }

    expect(analyze).toHaveBeenCalledTimes(2);
    expect(store.docs[0].aiDiagnosisSkipped).toBeUndefined();
  });
});

describe("hardening: AI diagnosis cache (H2)", () => {
  let store: MemoryStore;
  let guard: MemoryAiGuard;

  beforeEach(() => {
    store = new MemoryStore();
    guard = new MemoryAiGuard();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
    delete process.env.AI_RECOVERY_DIAGNOSIS_CACHE_TTL_SECONDS;
    delete process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT;
    delete process.env.AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS;
  });

  it("4. a cache hit serves the diagnosis without a new GPT call", async () => {
    const analyze = vi.fn(async () =>
      aiDiagnosis({
        classification: "AUTHORIZATION",
        recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
        safeRecoveryAvailable: true,
      })
    );
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    // Occurrence 1: fresh diagnosis, cached, executed through the policy gate.
    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    });
    expect(result).toBe("inserted");

    // Occurrence 2: cache hit serves the same (valid) diagnosis without a new
    // GPT call or budget spend, but the anti-hammer max-attempts cap escalates
    // this repeat failure to an incident — with the cached diagnosis attached
    // and flagged as served-from-cache.
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    expect(analyze).toHaveBeenCalledTimes(1); // second occurrence came from cache
    expect(guard.budgetLookups).toBe(1); // cache hit does not consume budget
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiRecommendation).toBe("GOOGLE_REFRESH_OAUTH_TOKEN");
    expect(store.docs[0].aiDiagnosisCached).toBe(true);
  });

  it("5. a cached diagnosis is still re-validated by the policy gate", async () => {
    const analyze = vi.fn(async () =>
      aiDiagnosis({
        classification: "AUTHORIZATION",
        recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
        safeRecoveryAvailable: true,
      })
    );
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    // Occurrence 1: fresh diagnosis, cached, executed through the policy gate.
    await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    });

    // Occurrence 2: cache hit — but the executor is gone, so the policy gate
    // must block execution of the (still valid) cached recommendation.
    resetRegistryForTests();
    const execute2 = vi.fn(async () => {
      throw googleForbidden();
    });
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute: execute2,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    expect(analyze).toHaveBeenCalledTimes(1); // still one GPT call
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiRecommendation).toBe("GOOGLE_REFRESH_OAUTH_TOKEN");
    expect(store.docs[0].aiDiagnosisCached).toBe(true);
    const blocked = store.docs[0].policyEvaluations?.find(
      (pe) => pe.actionId === "GOOGLE_REFRESH_OAUTH_TOKEN" && !pe.allowed
    );
    expect(blocked?.checks.some((c) => c.name === "executor" && !c.passed)).toBe(true);
  });

  it("6. expired cache entries are ignored and GPT is called again", async () => {
    process.env.AI_RECOVERY_DIAGNOSIS_CACHE_TTL_SECONDS = "0"; // entries expire immediately
    const analyze = vi.fn(async () =>
      aiDiagnosis({ classification: "AUTHORIZATION", recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN", safeRecoveryAvailable: true })
    );
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

        // Occurrence 1: TTL-0 means the entry expires immediately; GPT is called
    // again on the next occurrence. The fresh diagnosis executes successfully.
    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    });
    expect(result).toBe("inserted");

    // Occurrence 2: cache miss again (expired) → second GPT call → the
    // anti-hammer max-attempts cap escalates the repeat failure to an incident.
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    expect(analyze).toHaveBeenCalledTimes(2);
  });

  it("7. a failed GPT call is never cached", async () => {
    const analyze = vi
      .fn<() => Promise<AiDiagnosis | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        aiDiagnosis({ classification: "AUTHORIZATION", recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN", safeRecoveryAvailable: true })
      );
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    // Occurrence 1: GPT returns null → no cached payload, incident raised
    // (no execution, so the anti-hammer counter is untouched).
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    // Occurrence 2: GPT succeeds → executed → recovered.
    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    });
    expect(result).toBe("inserted");

    expect(analyze).toHaveBeenCalledTimes(2); // null result poisoned nothing
    expect(guard.cache).toHaveLength(1); // only the successful diagnosis is cached
  });

  it("8. cache keys and entries never contain secrets", async () => {
    const secretErr = new Error(
      `Verification failed: secret sk-live-4f79c01ff2ba4a2be88b4d77e5566b23 sid=${FAKE_SID_A}`
    );
    const analyze = vi.fn(async () => aiDiagnosis());
    const execute = vi.fn(async () => {
      return Promise.reject(secretErr);
    });
    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    // The engine keys the cache on the *redacted* message — reproduce that
    // exact key via normalizeError so the lookup matches.
    const normalized = normalizeError({
      error: secretErr,
      provider: "twilio",
      operation: "create_tollfree_verification",
    });
    const key = computeDiagnosisCacheKey({
      provider: "twilio",
      operation: "create_tollfree_verification",
      httpStatus: normalized.httpStatus,
      errorCode: normalized.errorCode,
      message: normalized.message,
    });
    expect(key).not.toContain("sk-live");
    expect(key).not.toContain(FAKE_SID_A);
    const serialized = JSON.stringify({ keys: guard.cache.map((c) => c.key), entries: guard.cache });
    expect(serialized).not.toContain("sk-live");
    expect(serialized).not.toContain(FAKE_SID_A);
    expect(await getCachedDiagnosis(guard, key)).not.toBeNull();
  });
});

describe("hardening: circuit breaker (H3)", () => {
  let store: MemoryStore;
  let breaker: MemoryCircuitBreaker;
  const key = () => circuitKey("google", "calendar_insert_event", "GOOGLE_REFRESH_OAUTH_TOKEN");

  beforeEach(() => {
    store = new MemoryStore();
    breaker = new MemoryCircuitBreaker();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
    delete process.env.AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD;
    delete process.env.AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS;
  });

  function failingExecutor() {
    return vi.fn(async () => ({ ok: false, detail: "refresh token failed" }));
  }

  it("9. a single failure does not open the breaker (threshold 2)", async () => {
    process.env.AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD = "2";
    const exec = failingExecutor();
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });

    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    expect(exec).toHaveBeenCalledTimes(1);
    expect((await getCircuitState(breaker, key())).state).toBe("CLOSED");
  });

  it("10. consecutive failures open the breaker and block the action (with audit trail)", async () => {
    process.env.AI_RECOVERY_CIRCUIT_BREAKER_FAILURE_THRESHOLD = "2";
    const exec = failingExecutor();
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });

    for (let i = 0; i < 2; i++) {
      resetPolicyCountersForTests();
      await expect(
        executeWithRecovery({
          provider: "google",
          operation: "calendar_insert_event",
          idempotent: false,
          execute,
          deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
        })
      ).rejects.toThrow(RecoveryError);
    }

    expect(exec).toHaveBeenCalledTimes(2);
    expect((await getCircuitState(breaker, key())).state).toBe("OPEN");

    // Third occurrence: blocked by the policy gate — executor untouched.
    resetPolicyCountersForTests();
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    expect(exec).toHaveBeenCalledTimes(2); // no probe while OPEN
    const pe = store.docs[store.docs.length - 1].policyEvaluations?.find(
      (e) => e.actionId === "GOOGLE_REFRESH_OAUTH_TOKEN" && !e.allowed
    );
    expect(pe?.allowed).toBe(false);
    expect(pe?.checks.find((c) => c.name === "circuit_breaker")?.passed).toBe(false);
  });

  it("11. after the cooldown the breaker goes HALF_OPEN and allows a probe", async () => {
    process.env.AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS = "1";
    await breaker.saveBreaker({
      key: key(),
      state: "OPEN",
      consecutiveFailures: 2,
      openedAt: new Date(Date.now() - 2000).toISOString(), // cooldown elapsed
    });
    const exec = vi.fn(async (ctx: { shared: Record<string, unknown> }) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true };
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
    });

    expect(result).toBe("inserted");
    expect(exec).toHaveBeenCalledTimes(1); // exactly one probe
  });

  it("12. a successful probe closes the breaker", async () => {
    await breaker.saveBreaker({
      key: key(),
      state: "OPEN",
      consecutiveFailures: 2,
      openedAt: new Date(Date.now() - 600_000).toISOString(),
    });
    const exec = vi.fn(async (ctx: { shared: Record<string, unknown> }) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true };
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
    });

    expect((await getCircuitState(breaker, key())).state).toBe("CLOSED");
  });

  it("13. a failed probe re-opens the breaker with a fresh cooldown", async () => {
    process.env.AI_RECOVERY_CIRCUIT_BREAKER_COOLDOWN_SECONDS = "60";
    await breaker.saveBreaker({
      key: key(),
      state: "OPEN",
      consecutiveFailures: 2,
      openedAt: new Date(Date.now() - 600_000).toISOString(),
    });
    const exec = failingExecutor();
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });

    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    const record = await breaker.getBreaker(key());
    expect(record?.state).toBe("OPEN");
    expect((await getCircuitState(breaker, key())).state).toBe("OPEN"); // fresh cooldown
  });

  it("14. breakers are scoped per provider+operation+action", async () => {
    await breaker.saveBreaker({
      key: key(),
      state: "OPEN",
      consecutiveFailures: 2,
      openedAt: new Date().toISOString(),
    });
    const twilioExec = vi.fn(async () => ({ ok: false, detail: "subaccount failed" }));
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", twilioExec);
    const execute = vi.fn(async () => {
      throw authTwilioError();
    });

    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        idempotent: true,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    expect(twilioExec).toHaveBeenCalledTimes(1); // unaffected by the google breaker
  });

  it("15. breaker storage failure is fail-safe (action still runs, pipeline never breaks)", async () => {
    breaker.failing = true;
    const exec = vi.fn(async (ctx: { shared: Record<string, unknown> }) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true };
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    const execute = vi.fn(async (shared: Record<string, unknown>) => {
      if (!shared.forceRefreshOAuth) throw googleForbidden();
      return "inserted";
    });

    const result = await executeWithRecovery({
      provider: "google",
      operation: "calendar_insert_event",
      idempotent: false,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
    });

    expect(result).toBe("inserted");
    expect(exec).toHaveBeenCalledTimes(1);
  });
});

describe("hardening: business vs technical failure (H4)", () => {
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

  it("16. explicit businessFailure flag → REQUIRES_ACTION incident, no retry, no recovery, no AI", async () => {
    const analyze = vi.fn(async () => aiDiagnosis());
    const execute = vi.fn(async () => {
      throw { businessFailure: true, status: 200, message: "Verification rejected by carrier" };
    });

    await expect(
      executeWithRecovery({
        provider: "twilio",
        operation: "create_tollfree_verification",
        idempotent: true,
        maxAttempts: 3,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze } },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(1); // zero retries
    expect(analyze).not.toHaveBeenCalled(); // no AI diagnosis for business failures
    const doc = store.docs[0];
    expect(doc.status).toBe("REQUIRES_ACTION");
    expect(doc.failureKind).toBe("BUSINESS");
    expect(doc.recoveryAttempted).toBe(false);
    expect(doc.aiRootCause).toBeUndefined();
  });

  it("17. HTTP 201 + REJECTED status is detected as a business failure", async () => {
    const err = {
      status: 201,
      message: "Toll-free verification submission",
      response: { data: { status: "REJECTED", code: 30007 } },
    };
    expect(detectBusinessFailure(err)).toBe(true);

    const execute = vi.fn(async () => {
      throw err;
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

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.docs[0].failureKind).toBe("BUSINESS");
  });

  it("18. malformed/rejected payloads on 2xx are business failures, not retryable", async () => {
    const execute = vi.fn(async () => {
      throw { status: 200, message: "Malformed payload: required field missing (rejected by provider)" };
    });
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        maxAttempts: 3,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(1); // not auto-retried
    expect(store.docs[0].failureKind).toBe("BUSINESS");
  });

  it("19. an invalid request (400 VALIDATION) is a technical failure with normal semantics", async () => {
    const execute = vi.fn(async () => {
      throw { status: 400, message: "Invalid parameter" };
    });
    await expect(
      executeWithRecovery({
        provider: "paddle",
        operation: "create_subscription",
        idempotent: false,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true },
      })
    ).rejects.toThrow(RecoveryError);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(store.docs[0].failureKind).toBe("TECHNICAL");
    expect(store.docs[0].status).toBe("OPEN");
  });

  it("20. a technical 500 on an idempotent operation still retries (failureKind TECHNICAL)", async () => {
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

    expect(execute).toHaveBeenCalledTimes(3); // bounded retries preserved
    expect(store.docs[0].failureKind).toBe("TECHNICAL");
  });
});

describe("hardening: policy audit trail (H6)", () => {
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

  it("21. an allowed evaluation reports all 10 checks passed", () => {
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
    const v = evaluateRecoveryAction("GOOGLE_REFRESH_OAUTH_TOKEN", {
      provider: "google",
      operation: "calendar_insert_event",
      category: "AUTHORIZATION",
      recoveryAttempted: false,
      previousActions: [],
      shared: {},
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
    });
    expect(v.allowed).toBe(true);
    const names = ["registered", "enabled", "executor", "provider", "operation", "category", "budget", "not_repeated", "max_attempts", "circuit_breaker"];
    expect(v.checks.map((c) => c.name)).toEqual(names);
    expect(v.checks.every((c) => c.passed)).toBe(true);
  });

  it("22. a blocked evaluation names the failing check and its reason", () => {
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async () => ({ ok: true }));
    const v = evaluateRecoveryAction("TWILIO_USE_SUBACCOUNT_AUTH", {
      provider: "google",
      operation: "calendar_insert_event",
      category: "AUTHORIZATION",
      recoveryAttempted: false,
      previousActions: [],
      shared: {},
      error: normalizeError({ error: googleForbidden(), provider: "google", operation: "calendar_insert_event" }),
    });
    expect(v.allowed).toBe(false);
    expect(v.checks.find((c) => c.name === "provider")?.passed).toBe(false);
    expect(v.allowed === false ? v.reason : undefined).toContain("does not apply to provider google");
  });

  it("23. policy evaluations are persisted on the incident", async () => {
    const breaker = new MemoryCircuitBreaker();
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        actions: ["GOOGLE_REFRESH_OAUTH_TOKEN"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    const pe = store.docs[0].policyEvaluations ?? [];
    expect(pe.length).toBeGreaterThan(0);
    const entry = pe.find((e) => e.actionId === "GOOGLE_REFRESH_OAUTH_TOKEN");
    expect(entry?.allowed).toBe(false); // no executor registered in this suite
    expect(entry?.checks.length).toBe(3); // registered, enabled, executor
  });

  it("24. an open circuit breaker is recorded inside the policy evaluation", async () => {
    const breaker = new MemoryCircuitBreaker();
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
    await breaker.saveBreaker({
      key: circuitKey("google", "calendar_insert_event", "GOOGLE_REFRESH_OAUTH_TOKEN"),
      state: "OPEN",
      consecutiveFailures: 2,
      openedAt: new Date().toISOString(),
    });
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        actions: ["GOOGLE_REFRESH_OAUTH_TOKEN"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      })
    ).rejects.toThrow(RecoveryError);

    const entry = store.docs[0].policyEvaluations?.find(
      (e) => e.actionId === "GOOGLE_REFRESH_OAUTH_TOKEN"
    );
    expect(entry?.allowed).toBe(false);
    expect(entry?.checks.find((c) => c.name === "circuit_breaker")?.passed).toBe(false);
    expect(entry?.checks.find((c) => c.name === "circuit_breaker")?.reason).toContain("Circuit breaker open");
  });

  it("25. a cached AI recommendation that the policy rejects is never executed", async () => {
    const guard = new MemoryAiGuard();
    const analyze = vi.fn(async () =>
      aiDiagnosis({
        classification: "AUTHORIZATION",
        recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
        safeRecoveryAvailable: true,
      })
    );
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    // No executor registered → policy must block even though AI recommended it.
    expect(analyze).toHaveBeenCalledTimes(1);
    const pe = store.docs[0].policyEvaluations?.find(
      (e) => e.actionId === "GOOGLE_REFRESH_OAUTH_TOKEN"
    );
    expect(pe?.allowed).toBe(false);
    expect(store.docs[0].aiRecommendation).toBe("GOOGLE_REFRESH_OAUTH_TOKEN");
  });
});

describe("hardening: concurrency", () => {
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

  it("26. two simultaneous identical failures create ONE aggregated incident", async () => {
    const execute = vi.fn(async () => {
      throw new Error("Something utterly unrecognizable happened");
    });
    const opts = {
      provider: "unknown" as const,
      operation: "mystery_op",
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    };

    const results = await Promise.allSettled([
      executeWithRecovery(opts),
      executeWithRecovery(opts),
    ]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);

    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].occurrenceCount).toBe(2);
  });

  it("27. racing recovery attempts execute the recovery action exactly once", async () => {
    let actionRuns = 0;
    registerRecoveryActionExecutor("TWILIO_USE_SUBACCOUNT_AUTH", async () => {
      actionRuns++;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: false, detail: "subaccount failure" };
    });
    const execute = vi.fn(async () => {
      throw authTwilioError();
    });
    const opts = {
      provider: "twilio" as const,
      operation: "create_tollfree_verification",
      idempotent: true,
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true },
    };

    const results = await Promise.allSettled([executeWithRecovery(opts), executeWithRecovery(opts)]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);

    expect(actionRuns).toBe(1); // dedupe: only one execution
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].occurrenceCount).toBe(2);
    expect(store.docs[0].status).toBe("REQUIRES_ACTION");
  });

  it("28. two simultaneous AI diagnosis requests for one fingerprint call GPT once", async () => {
    const guard = new MemoryAiGuard();
    let analyzeRuns = 0;
    const analyze = vi.fn(async () => {
      analyzeRuns++;
      await new Promise((r) => setTimeout(r, 30));
      return aiDiagnosis({ classification: "AUTHORIZATION" });
    });
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    const opts = {
      provider: "google" as const,
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    };

    const results = await Promise.allSettled([executeWithRecovery(opts), executeWithRecovery(opts)]);
    expect(results.every((r) => r.status === "rejected")).toBe(true);

    expect(analyzeRuns).toBe(1);
    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiDiagnosisCached).toBe(true);
  });
});

describe("hardening: admin retry + store", () => {
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

  async function seedIncident(status: "OPEN" | "REQUIRES_ACTION" = "REQUIRES_ACTION") {
    return recordIncident({
      error: normalizeError({
        error: googleForbidden(),
        provider: "google",
        operation: "calendar_insert_event",
        businessId: "b-retry",
      }),
      context: { eventPayload: { event: { summary: "x" } } },
      retryCount: 0,
      status,
      store,
    } as never);
  }

  it("29. manual retry on a terminal incident is refused without touching the executor", async () => {
    const incident = await seedIncident();
    await store.updateOne({ _id: incident?._id }, { $set: { status: "RESOLVED" } });
    const exec = vi.fn(async () => ({ ok: true, detail: "done" }));
    registerOperationExecutor("google", "calendar_insert_event", exec);

    const again = await retryIncident(String(incident?._id), "admin-2", { store });
    expect(again.ok).toBe(false);
    expect(again.error).toBe("already_resolved");
    expect(exec).not.toHaveBeenCalled();
  });

  it("30. racing manual retries execute the operation executor exactly once", async () => {
    const incident = await seedIncident();
    let runs = 0;
    registerOperationExecutor("google", "calendar_insert_event", async () => {
      runs++;
      await new Promise((r) => setTimeout(r, 30));
      return { ok: true, detail: "created" };
    });

    const [a, b] = await Promise.all([
      retryIncident(String(incident?._id), "admin-1", { store }),
      retryIncident(String(incident?._id), "admin-2", { store }),
    ]);

    expect(runs).toBe(1);
    const oks = [a.ok, b.ok].filter(Boolean).length;
    expect(oks).toBe(1);
    const inFlight = [a.error, b.error].filter((e) => e === "retry_in_progress").length;
    expect(inFlight).toBe(1);
  });

  it("30b. admin retry failure notes are redacted before persisting", async () => {
    const incident = await seedIncident();
    registerOperationExecutor("google", "calendar_insert_event", async () => ({
      ok: false,
      detail:
        "Verification failed: sid=AC1234567890abcdef1234567890abcd, " +
        "Authorization: Bearer hunter2hunter2hunter2hunter2hunter2, " +
        "mongodb+srv://admin:hunter2@cluster0.example.com/db",
    }));

    const result = await retryIncident(String(incident?._id), "admin-1", { store });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("retry_failed");

    const doc = store.docs[0];
    const adminEvents = (doc.timeline || []).filter((t) => t.type === "admin_action");
    const detail = adminEvents[adminEvents.length - 1]?.detail || "";
    expect(detail).not.toContain("AC1234567890abcdef1234567890abcd");
    expect(detail).not.toContain("hunter2");
    expect(detail).not.toContain("mongodb");
    expect(detail).toContain("[REDACTED]");
    expect(detail).toContain("Manual retry failed");
  });

  it("31. policy evaluations survive queryIncidents (audit trail persists)", async () => {
    const incident = await seedIncident();
    const pe = {
      actionId: "GOOGLE_REFRESH_OAUTH_TOKEN",
      allowed: false,
      reason: "no executor",
      checks: [{ name: "executor", passed: false, reason: "no executor" }],
      at: new Date().toISOString(),
    };
    await store.updateOne({ _id: incident?._id }, { $set: { policyEvaluations: [pe] } });

    const listed = await queryIncidents({ provider: "google" }, store);
    expect(listed[0].policyEvaluations?.[0].actionId).toBe("GOOGLE_REFRESH_OAUTH_TOKEN");
    expect(listed[0].policyEvaluations?.[0].checks[0].passed).toBe(false);
  });

  it("32. cache-hit occurrences persist aiDiagnosisCached on the (aggregated) incident", async () => {
    const guard = new MemoryAiGuard();
    const analyze = vi.fn(async () =>
      aiDiagnosis({ classification: "AUTHORIZATION", recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN", safeRecoveryAvailable: true })
    );
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });
    const opts = {
      provider: "google" as const,
      operation: "calendar_insert_event",
      idempotent: false,
      actions: ["DOES_NOT_EXIST"],
      execute,
      deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
    };

    // First occurrence fails the rerun after executing the recommended action;
    // the second occurrence is served from the cache and records the flag.
    for (let i = 0; i < 2; i++) {
      await executeWithRecovery(opts).catch(() => {});
    }

    expect(store.docs).toHaveLength(1);
    expect(store.docs[0].aiDiagnosisCached).toBe(true);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("33. recordIncident merges new audit fields when aggregating", async () => {
    const first = await recordIncident({
      error: normalizeError({ error: weirdError(), provider: "unknown", operation: "op" }),
      context: {},
      retryCount: 0,
      aiFlags: { skipped: true, skipReason: "budget_exhausted" },
      policyEvaluations: [
        { actionId: "A", allowed: false, reason: "x", checks: [{ name: "registered", passed: false }], at: new Date().toISOString() },
      ],
      store,
    } as never);

    await recordIncident({
      error: normalizeError({ error: weirdError(), provider: "unknown", operation: "op" }),
      context: {},
      retryCount: 0,
      aiFlags: { skipped: false, cached: true },
      policyEvaluations: [
        { actionId: "B", allowed: true, checks: [{ name: "registered", passed: true }], at: new Date().toISOString() },
      ],
      store,
    } as never);

    const doc = store.docs[0];
    expect(doc._id).toBe(first?._id);
    expect(doc.occurrenceCount).toBe(2);
    expect(doc.aiDiagnosisCached).toBe(true);
    expect(doc.aiDiagnosisSkipped).toBe(false);
    expect(doc.policyEvaluations?.map((pe) => pe.actionId)).toEqual(["A", "B"]);
  });

  it("34. consumeDiagnosisBudget opens a fresh window after expiry (unit)", async () => {
    const guard = new MemoryAiGuard();
    process.env.AI_RECOVERY_MAX_DIAGNOSES_PER_FINGERPRINT = "2";
    process.env.AI_RECOVERY_DIAGNOSIS_WINDOW_SECONDS = "1";
    const r1 = await consumeDiagnosisBudget(guard, "fp-1");
    const r2 = await consumeDiagnosisBudget(guard, "fp-1");
    const r3 = await consumeDiagnosisBudget(guard, "fp-1");
    expect([r1.allowed, r2.allowed, r3.allowed]).toEqual([true, true, false]);
    // Emulate an elapsed window by backdating the stored record.
    const stale = guard.budgets[0];
    await guard.saveBudget({ ...stale, windowStart: new Date(Date.now() - 2000).toISOString() });
    const r4 = await consumeDiagnosisBudget(guard, "fp-1");
    expect(r4.allowed).toBe(true);
    expect(r4.used).toBe(1);
  });
});

describe("hardening: context redaction before AI (H7)", () => {
  let store: MemoryStore;
  let guard: MemoryAiGuard;

  beforeEach(() => {
    store = new MemoryStore();
    guard = new MemoryAiGuard();
    resetRegistryForTests();
    resetPolicyCountersForTests();
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
  });

  function secretContext(): Record<string, unknown> {
    return {
      apiKey: "sk-live-4f79c01ff2ba4a2be88b4d77e5566b23",
      integration: {
        accessToken: "ya29.a0AfH6SMabcdefghijklmnopqrstuvwxyz12345678901234567890",
        twilioSid: "AC1234567890abcdef1234567890abcd",
      },
      headers: { authorization: "Bearer hunter2hunter2hunter2hunter2hunter2" },
      notes: [{ token: "SuperSecretToken123" }],
      useful: "debug tag: tfv-submission #42",
    };
  }

  it("7A. sensitive values in opts.context never reach the analyzer (nested + arrays)", async () => {
    const seen: AiAnalysisInput[] = [];
    const analyze = vi.fn(async (input: AiAnalysisInput) => {
      seen.push(input);
      return aiDiagnosis({
        classification: "AUTHORIZATION",
        recommendedAction: "GOOGLE_REFRESH_OAUTH_TOKEN",
        safeRecoveryAvailable: true,
      });
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", googleRefreshExecutor);
    const execute = vi.fn(async () => {
      throw googleForbidden();
    });

    await expect(
      executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        actions: ["DOES_NOT_EXIST"],
        execute,
        context: secretContext(),
        deps: { store, logger: silentLogger, disableAlerts: true, ai: { analyze }, aiGuard: guard },
      })
    ).rejects.toThrow(RecoveryError);

    expect(analyze).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(seen[0].context);
    expect(serialized).not.toContain("sk-live-4f79c01ff2ba4a2be88b4d77e5566b23");
    expect(serialized).not.toContain("ya29.");
    expect(serialized).not.toContain("AC1234567890abcdef1234567890abcd");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("SuperSecretToken123");
    // useful non-sensitive diagnostics survive
    expect(serialized).toContain("debug tag");
  });
});

describe("hardening: production memory-store fallback warning (H8)", () => {
  function withEnv(nodeEnv: string | undefined, token: string | undefined, fn: () => void) {
    const prevEnv = process.env.NODE_ENV;
    const prevToken = process.env.ASTRA_DB_APPLICATION_TOKEN;
    const env = process.env as Record<string, string | undefined>;
    if (nodeEnv === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = nodeEnv;
    if (token === undefined) delete env.ASTRA_DB_APPLICATION_TOKEN;
    else env.ASTRA_DB_APPLICATION_TOKEN = token;
    try {
      fn();
    } finally {
      if (prevEnv === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = prevEnv;
      if (prevToken === undefined) delete env.ASTRA_DB_APPLICATION_TOKEN;
      else env.ASTRA_DB_APPLICATION_TOKEN = prevToken;
    }
  }

  it("1. production without Astra warns loudly exactly once per process", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    withEnv("production", undefined, () => {
      checkMemoryFallbackWarning("ai-guard", false);
      checkMemoryFallbackWarning("ai-guard", false);
      checkMemoryFallbackWarning("circuit-breaker", false);
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("IN-MEMORY FALLBACK");
    expect(String(warn.mock.calls[0][0])).toContain("ASTRA_DB_APPLICATION_TOKEN");
    warn.mockRestore();
  });

  it("2. dev/test memory fallback stays silent and keeps working", async () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    await withEnv("test", undefined, async () => {
      checkMemoryFallbackWarning("ai-guard", false);
      const budget = await aiGuardStore.findBudget("fp-warning-test");
      expect(budget).toBeNull();
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("3. production with Astra configured never warns", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    withEnv("production", "AstraCS:test:token-not-a-real-secret", () => {
      checkMemoryFallbackWarning("ai-guard", true);
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("hardening: anti-hammer scoped per recovery occurrence (H9)", () => {
  let store: MemoryStore;
  let breaker: MemoryCircuitBreaker;

  beforeEach(() => {
    store = new MemoryStore();
    breaker = new MemoryCircuitBreaker();
    resetRegistryForTests();
    resetPolicyCountersForTests();
    process.env.RECOVERY_AI_DISABLED = "true";
  });

  afterEach(() => {
    delete process.env.RECOVERY_AI_DISABLED;
  });

  function refreshExecutor() {
    const exec = vi.fn(async (ctx: { shared: Record<string, unknown> }) => {
      ctx.shared.forceRefreshOAuth = true;
      return { ok: true, detail: "refreshed" };
    });
    registerRecoveryActionExecutor("GOOGLE_REFRESH_OAUTH_TOKEN", exec);
    return exec;
  }

  it("A. business A's attempt does not consume business B's budget", async () => {
    const exec = refreshExecutor();
    for (const businessId of ["biz-A", "biz-B"]) {
      const execute = vi.fn(async (shared: Record<string, unknown>) => {
        if (!shared.forceRefreshOAuth) throw googleForbidden();
        return "inserted";
      });
      const result = await executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        businessId,
        execute,
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      });
      expect(result).toBe("inserted");
    }
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it("B. the same fingerprint still respects maxAttempts=1", async () => {
    const exec = refreshExecutor();
    const opts = {
      provider: "google" as const,
      operation: "calendar_insert_event",
      idempotent: false,
      businessId: "biz-A",
      execute: vi.fn(async (shared: Record<string, unknown>) => {
        if (!shared.forceRefreshOAuth) throw googleForbidden();
        return "inserted";
      }),
      deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
    };

    const r1 = await executeWithRecovery(opts);
    expect(r1).toBe("inserted");

    await expect(executeWithRecovery(opts)).rejects.toThrow(RecoveryError);
    expect(exec).toHaveBeenCalledTimes(1);
    const blocked = store.docs[0]?.policyEvaluations?.find((pe) => !pe.allowed);
    expect(blocked?.checks.some((c) => c.name === "max_attempts" && !c.passed)).toBe(true);
  });

  it("C. different message fingerprints have independent budgets", async () => {
    const exec = refreshExecutor();
    const mkExecute = (message: string) =>
      vi.fn(async (shared: Record<string, unknown>) => {
        if (!shared.forceRefreshOAuth) throw Object.assign(new Error(message), { status: 403 });
        return "inserted";
      });
    for (const message of ["oauth scope expired for calendar", "oauth scope expired again for calendar"]) {
      const result = await executeWithRecovery({
        provider: "google",
        operation: "calendar_insert_event",
        idempotent: false,
        businessId: "biz-A",
        execute: mkExecute(message),
        deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
      });
      expect(result).toBe("inserted");
    }
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it("D. the same fingerprint can consume different actions independently", async () => {
    const goog = refreshExecutor();
    const retry = vi.fn(async () => ({ ok: true, detail: "retried" }));
    registerRecoveryActionExecutor("RETRY_ONCE_READ", retry);
    const run = vi.fn(async () => undefined);
    const base = {
      provider: "google" as const,
      operation: "calendar_insert_event",
      recoveryAttempted: false,
      previousActions: [] as string[],
      shared: {} as Record<string, unknown>,
      fingerprint: "fp-same",
    };
    const authErr = normalizeError({
      error: Object.assign(new Error("refresh failed"), { status: 403 }),
      provider: "google",
      operation: "calendar_insert_event",
    });
    const netErr = normalizeError({
      error: Object.assign(new Error("socket reset"), { status: 503 }),
      provider: "google",
      operation: "calendar_insert_event",
    });

    const r1 = await executeValidatedAction(
      "GOOGLE_REFRESH_OAUTH_TOKEN",
      { ...base, category: "AUTHORIZATION" as ErrorCategory, error: authErr },
      run
    );
    expect(r1.executed).toBe(true);
    const r2 = await executeValidatedAction(
      "RETRY_ONCE_READ",
      { ...base, category: "NETWORK" as ErrorCategory, error: netErr },
      run
    );
    expect(r2.executed).toBe(true);
    expect(goog).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("E. concurrent businesses each get an independent attempt budget", async () => {
    const exec = refreshExecutor();
    const results = await Promise.allSettled(
      ["A", "B", "C", "D"].map((biz) =>
        executeWithRecovery({
          provider: "google",
          operation: "calendar_insert_event",
          idempotent: false,
          businessId: `biz-${biz}`,
          execute: vi.fn(async (shared: Record<string, unknown>) => {
            await new Promise((r) => setTimeout(r, 5));
            if (!shared.forceRefreshOAuth) throw googleForbidden();
            return "inserted";
          }),
          deps: { store, logger: silentLogger, disableAlerts: true, circuitBreaker: breaker },
        })
      )
    );
    for (const r of results) expect(r.status).toBe("fulfilled");
    expect(exec).toHaveBeenCalledTimes(4);
  });
});
