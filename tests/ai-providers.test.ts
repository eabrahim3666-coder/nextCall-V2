import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the OpenAI SDK so no test ever makes a real network call.
// `createMock` stands in for client.chat.completions.create.
// `ctorMock` captures constructor options so tests can prove which endpoint
// (api.openai.com vs Gemini's OpenAI-compatible endpoint) was selected.
// ---------------------------------------------------------------------------
const { createMock, ctorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  ctorMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createMock } };
    constructor(opts: unknown) {
      ctorMock(opts);
    }
  },
}));

import {
  chatCompletion,
  AiProvidersUnavailableError,
  resetAiClientForTests,
} from "../lib/ai/client";
import {
  resolveProviders,
  getProviders,
  getProviderSummaries,
  resetProvidersForTests,
  PROVIDER_BASE_URLS,
  LEGACY_OPENAI_MODEL,
} from "../lib/ai/config";
import { classifyAiError, isSafetyRefusal } from "../lib/ai/classify";
import { claimWebhookEventOnce, callsCollection } from "../lib/astra";
import { handleSmsMessage } from "../lib/sms-chat";

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

const ENV_KEYS = [
  "AI_PROVIDER_1_TYPE", "AI_PROVIDER_1_API_KEY", "AI_PROVIDER_1_MODEL",
  "AI_PROVIDER_2_TYPE", "AI_PROVIDER_2_API_KEY", "AI_PROVIDER_2_MODEL",
  "AI_PROVIDER_3_TYPE", "AI_PROVIDER_3_API_KEY", "AI_PROVIDER_3_MODEL",
  "OPENAI_API_KEY", "OPENAI_MODEL",
];

function setEnv(vars: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(vars)) {
    if (value !== undefined) process.env[key] = value;
  }
  resetProvidersForTests();
  resetAiClientForTests();
}

const PRIMARY = {
  AI_PROVIDER_1_TYPE: "openai",
  AI_PROVIDER_1_API_KEY: "sk-test-primary-not-a-real-key",
  AI_PROVIDER_1_MODEL: "gpt-4o-mini",
};
const FALLBACK = {
  AI_PROVIDER_2_TYPE: "gemini",
  AI_PROVIDER_2_API_KEY: "AIza-test-fallback-not-a-real-key",
  AI_PROVIDER_2_MODEL: "gemini-3.8-flash",
};

// ---------------------------------------------------------------------------
// Completion / error fixtures
// ---------------------------------------------------------------------------

function okCompletion(content = "hello", finishReason: string | null = "stop") {
  return {
    id: "cmpl-1",
    object: "chat.completion",
    created: 0,
    model: "test",
    choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content } }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

function toolCompletion(id: string, name: string, args: Record<string, unknown>) {
  return {
    id: "cmpl-t",
    object: "chat.completion",
    created: 0,
    model: "test",
    choices: [
      {
        index: 0,
        finish_reason: "tool_calls",
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
        },
      },
    ],
  };
}

function httpError(status: number, code?: string, message?: string) {
  return Object.assign(new Error(message || `HTTP ${status}`), { status, code });
}

const quotaError = () =>
  httpError(429, "insufficient_quota", "You exceeded your current quota, please check your plan and billing details.");

beforeEach(() => {
  createMock.mockReset();
  ctorMock.mockReset();
});

afterEach(() => {
  setEnv({});
});

// ---------------------------------------------------------------------------
// 1. Provider configuration
// ---------------------------------------------------------------------------

describe("ai provider configuration", () => {
  it("reads numbered slots in declaration order", () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    const providers = getProviders();
    expect(providers.map((p) => p.id)).toEqual(["provider-1", "provider-2"]);
    expect(providers[0].type).toBe("openai");
    expect(providers[0].model).toBe("gpt-4o-mini");
    expect(providers[0].baseURL).toBeUndefined(); // OpenAI default endpoint
    expect(providers[1].type).toBe("gemini");
    expect(providers[1].baseURL).toBe(PROVIDER_BASE_URLS.gemini);
  });

  it("supports a third provider without any code change", () => {
    setEnv({
      ...PRIMARY,
      ...FALLBACK,
      AI_PROVIDER_3_TYPE: "openai",
      AI_PROVIDER_3_API_KEY: "sk-test-third-not-a-real-key",
      AI_PROVIDER_3_MODEL: "gpt-4o",
    });
    expect(getProviders().map((p) => p.id)).toEqual(["provider-1", "provider-2", "provider-3"]);
  });

  it("stops at the first numbering gap", () => {
    setEnv({
      ...PRIMARY,
      AI_PROVIDER_3_TYPE: "gemini",
      AI_PROVIDER_3_API_KEY: "AIza-test-not-a-real-key",
      AI_PROVIDER_3_MODEL: "gemini-3.8-flash",
    });
    expect(getProviders().map((p) => p.id)).toEqual(["provider-1"]);
  });

  it("treats placeholder credentials as not configured", () => {
    setEnv({
      ...PRIMARY,
      AI_PROVIDER_2_TYPE: "gemini",
      AI_PROVIDER_2_API_KEY: "PASTE_MY_GEMINI_API_KEY_HERE",
      AI_PROVIDER_2_MODEL: "gemini-3.8-flash",
    });
    expect(getProviders().map((p) => p.id)).toEqual(["provider-1"]);
  });

  it("skips an unknown provider type but keeps scanning", () => {
    setEnv({
      AI_PROVIDER_1_TYPE: "anthropic",
      AI_PROVIDER_1_API_KEY: "x",
      AI_PROVIDER_1_MODEL: "y",
      ...FALLBACK,
    });
    expect(getProviders().map((p) => p.id)).toEqual(["provider-2"]);
  });

  it("defaults provider 1 (OpenAI) to the legacy model when no model is given", () => {
    setEnv({ AI_PROVIDER_1_TYPE: "openai", AI_PROVIDER_1_API_KEY: "sk-test-not-a-real-key" });
    const providers = getProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].model).toBe(LEGACY_OPENAI_MODEL);
  });

  it("skips a non-OpenAI slot that has no model", () => {
    setEnv({
      ...PRIMARY,
      AI_PROVIDER_2_TYPE: "gemini",
      AI_PROVIDER_2_API_KEY: "AIza-test-not-a-real-key",
      // AI_PROVIDER_2_MODEL intentionally omitted
    });
    expect(getProviders().map((p) => p.id)).toEqual(["provider-1"]);
  });
});

describe("legacy OPENAI_API_KEY compatibility", () => {
  it("builds a single OpenAI provider when no numbered slots exist", () => {
    setEnv({ OPENAI_API_KEY: "sk-test-legacy-not-a-real-key" });
    const providers = resolveProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0]).toMatchObject({
      id: "provider-1",
      type: "openai",
      model: LEGACY_OPENAI_MODEL,
      baseURL: undefined,
    });
  });

  it("honours OPENAI_MODEL in legacy mode", () => {
    setEnv({ OPENAI_API_KEY: "sk-test-legacy-not-a-real-key", OPENAI_MODEL: "gpt-4o" });
    expect(resolveProviders()[0].model).toBe("gpt-4o");
  });

  it("falls back to OPENAI_API_KEY when provider 1 omits its own key", () => {
    setEnv({
      AI_PROVIDER_1_TYPE: "openai",
      AI_PROVIDER_1_MODEL: "gpt-4o-mini",
      OPENAI_API_KEY: "sk-test-legacy-not-a-real-key",
    });
    const providers = resolveProviders();
    expect(providers).toHaveLength(1);
    expect(providers[0].apiKey).toBe("sk-test-legacy-not-a-real-key");
  });

  it("returns no providers when nothing is configured", () => {
    setEnv({});
    expect(resolveProviders()).toEqual([]);
  });
});

describe("provider summaries never leak secrets", () => {
  it("exposes only id, type and model", () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    const summaries = getProviderSummaries();
    expect(summaries.length).toBe(2);
    for (const s of summaries) {
      expect(Object.keys(s).sort()).toEqual(["id", "model", "type"]);
    }
    const serialized = JSON.stringify(summaries);
    expect(serialized).not.toContain("sk-test-primary-not-a-real-key");
    expect(serialized).not.toContain("AIza-test-fallback-not-a-real-key");
  });
});

// ---------------------------------------------------------------------------
// 2. Failure classification
// ---------------------------------------------------------------------------

describe("ai failure classification", () => {
  it("classifies confirmed quota/billing exhaustion as failover, no retry", () => {
    const d = classifyAiError(quotaError());
    expect(d.category).toBe("QUOTA_EXHAUSTED");
    expect(d.failover).toBe(true);
    expect(d.retry).toBe(false);
  });

  it("does NOT treat a plain 429 as exhausted credit", () => {
    const d = classifyAiError(httpError(429, "rate_limit_exceeded", "Rate limit reached"));
    expect(d.category).toBe("RATE_LIMIT");
    expect(d.retry).toBe(true);
    expect(d.failover).toBe(true);
  });

  it("fails fast on malformed requests (no failover)", () => {
    const d = classifyAiError(httpError(400, "invalid_request_error", "Unsupported parameter: foo"));
    expect(d.category).toBe("VALIDATION");
    expect(d.failover).toBe(false);
    expect(d.retry).toBe(false);
  });

  it("fails over on authentication failures, without retrying", () => {
    const d = classifyAiError(httpError(401, "invalid_api_key", "Incorrect API key provided"));
    expect(d.category).toBe("AUTHENTICATION");
    expect(d.failover).toBe(true);
    expect(d.retry).toBe(false);
  });

  it("fails over on authorization failures", () => {
    expect(classifyAiError(httpError(403)).category).toBe("AUTHORIZATION");
  });

  it("fails over on an unsupported model id", () => {
    const d = classifyAiError(httpError(404, "model_not_found", "The model `gpt-x` does not exist"));
    expect(d.category).toBe("MODEL_NOT_FOUND");
    expect(d.failover).toBe(true);
  });

  it("treats 5xx as transient: retry then failover", () => {
    const d = classifyAiError(httpError(503));
    expect(d.category).toBe("SERVER_ERROR");
    expect(d.retry).toBe(true);
    expect(d.failover).toBe(true);
  });

  it("treats connection errors as transient network failures", () => {
    const d = classifyAiError(Object.assign(new Error("fetch failed"), { name: "APIConnectionError" }));
    expect(d.category).toBe("NETWORK");
    expect(d.retry).toBe(true);
  });

  it("never fails over or retries a safety refusal", () => {
    const d = classifyAiError(httpError(400, "content_policy_violation", "Your request was rejected as a result of our safety system"));
    expect(d.category).toBe("SAFETY_REFUSAL");
    expect(d.failover).toBe(false);
    expect(d.retry).toBe(false);
  });

  it("detects a safety refusal carried on finish_reason", () => {
    expect(isSafetyRefusal(null, "content_filter")).toBe(true);
    expect(isSafetyRefusal(null, "stop")).toBe(false);
  });

  it("fails fast on unknown errors", () => {
    const d = classifyAiError(new Error("something odd"));
    expect(d.category).toBe("UNKNOWN");
    expect(d.failover).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Provider chain / failover behaviour
// ---------------------------------------------------------------------------

const userMsg = [{ role: "user" as const, content: "hi" }];

describe("ai provider chain", () => {
  it("uses the primary provider and never touches the fallback", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockResolvedValue(okCompletion("primary reply"));

    const { completion, providerId } = await chatCompletion({ messages: userMsg });

    expect(providerId).toBe("provider-1");
    expect(completion.choices[0].message.content).toBe("primary reply");
    expect(createMock).toHaveBeenCalledTimes(1);
    // The provider's own configured model is injected.
    expect(createMock.mock.calls[0][0].model).toBe("gpt-4o-mini");
  });

  it("falls over to Gemini when the primary quota is exhausted", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockImplementation(async (body: { model?: string }) => {
      if (body.model === "gpt-4o-mini") throw quotaError();
      return okCompletion("gemini reply");
    });

    const { completion, providerId } = await chatCompletion({ messages: userMsg });

    expect(providerId).toBe("provider-2");
    expect(completion.choices[0].message.content).toBe("gemini reply");
    expect(createMock).toHaveBeenCalledTimes(2);
    // The Gemini provider used Google's OpenAI-compatible endpoint.
    expect(ctorMock).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: PROVIDER_BASE_URLS.gemini })
    );
    // The SDK's own retries are disabled — we own the attempt count.
    expect(ctorMock).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 }));
  });

  it("does NOT fail over on a malformed request (a bug is never masked)", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockImplementation(async (body: { model?: string }) => {
      if (body.model === "gpt-4o-mini") {
        throw httpError(400, "invalid_request_error", "Unsupported parameter: max_tokens");
      }
      return okCompletion("should not be reached");
    });

    await expect(chatCompletion({ messages: userMsg })).rejects.toBeInstanceOf(
      AiProvidersUnavailableError
    );
    expect(createMock).toHaveBeenCalledTimes(1); // fallback never tried
  });

  it("retries a transient failure on the SAME provider before failing over", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce(okCompletion("recovered on retry"));

    const { completion, providerId } = await chatCompletion({ messages: userMsg });

    expect(providerId).toBe("provider-1");
    expect(completion.choices[0].message.content).toBe("recovered on retry");
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("is bounded: it never loops forever when everything fails", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockRejectedValue(httpError(503));

    await expect(chatCompletion({ messages: userMsg })).rejects.toBeInstanceOf(
      AiProvidersUnavailableError
    );
    // 2 providers × (1 attempt + 1 transient retry) = 4 — hard bound.
    expect(createMock.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it("throws a controlled error when every provider fails", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockRejectedValue(quotaError());

    await expect(chatCompletion({ messages: userMsg })).rejects.toThrow(
      /All 2 configured AI provider\(s\) failed/
    );
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("throws a controlled error when no provider is configured", async () => {
    setEnv({});
    await expect(chatCompletion({ messages: userMsg })).rejects.toMatchObject({
      name: "AiProvidersUnavailableError",
      category: "NO_PROVIDER",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("a pinned provider restricts the call to that provider only", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockResolvedValue(okCompletion("pinned"));

    const { providerId } = await chatCompletion({ messages: userMsg }, { providerId: "provider-2" });

    expect(providerId).toBe("provider-2");
    expect(createMock.mock.calls[0][0].model).toBe("gemini-3.8-flash");
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("a pinned provider does not fail over when it fails", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockRejectedValue(quotaError());

    await expect(
      chatCompletion({ messages: userMsg }, { providerId: "provider-2" })
    ).rejects.toBeInstanceOf(AiProvidersUnavailableError);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("returns a safety-filtered completion instead of failing over", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockResolvedValue(okCompletion("", "content_filter"));

    const { providerId } = await chatCompletion({ messages: userMsg });

    expect(providerId).toBe("provider-1");
    expect(createMock).toHaveBeenCalledTimes(1); // never retried elsewhere
  });

  it("reports which provider served the request via onProvider", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    createMock.mockImplementation(async (body: { model?: string }) => {
      if (body.model === "gpt-4o-mini") throw quotaError();
      return okCompletion("gemini");
    });

    const seen: string[] = [];
    await chatCompletion({ messages: userMsg }, { onProvider: (id) => seen.push(id) });
    expect(seen).toEqual(["provider-2"]);
  });
});

// ---------------------------------------------------------------------------
// 4. Webhook dedupe (atomic claim)
// ---------------------------------------------------------------------------

describe("webhook dedupe", () => {
  it("claims a key exactly once", async () => {
    const key = `twilio:sms:SM_test_single_${Date.now()}`;
    expect(await claimWebhookEventOnce(key, { provider: "twilio" })).toBe(true);
    expect(await claimWebhookEventOnce(key, { provider: "twilio" })).toBe(false);
  });

  it("is safe under concurrent deliveries (only one claim wins)", async () => {
    const key = `twilio:sms:SM_test_concurrent_${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => claimWebhookEventOnce(key, { provider: "twilio" }))
    );
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("treats distinct keys as distinct events", async () => {
    const a = `twilio:sms:SM_a_${Date.now()}`;
    const b = `twilio:sms:SM_b_${Date.now()}`;
    expect(await claimWebhookEventOnce(a, { provider: "twilio" })).toBe(true);
    expect(await claimWebhookEventOnce(b, { provider: "twilio" })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. SMS tool loop: provider consistency, no duplicate side effects,
//    booking idempotency
// ---------------------------------------------------------------------------

let bizCounter = 0;
function testBusiness() {
  bizCounter += 1;
  return {
    business_id: `biz-ai-test-${Date.now()}-${bizCounter}`,
    business_name: "Test Co",
    business_type: "HVAC",
    service_area: "Tulsa",
    knowledge_base_text: "We do AC repair.",
  };
}

async function bookedCalls(businessId: string) {
  return callsCollection.find({ business_id: businessId, appointment_booked: true }).toArray();
}

describe("SMS tool loop", () => {
  it("runs a multi-round tool call and books exactly one appointment", async () => {
    setEnv({ ...PRIMARY });
    const business = testBusiness();
    createMock
      .mockResolvedValueOnce(
        toolCompletion("call_1", "book_appointment", {
          date_time: "2026-12-01T10:00:00",
          summary: "AC repair",
          customer_name: "Sam",
        })
      )
      .mockResolvedValueOnce(okCompletion("All set — you're booked!"));

    const { reply } = await handleSmsMessage({
      from: "+15550000001",
      to: "+15550000002",
      body: "Can I book Tuesday at 10?",
      channel: "SMS",
      business,
    });

    expect(reply).toBe("All set — you're booked!");
    expect(createMock).toHaveBeenCalledTimes(2); // one tool round + one final reply
    expect(await bookedCalls(business.business_id)).toHaveLength(1);
  });

  it("never repeats an already-executed tool call, even with different args", async () => {
    setEnv({ ...PRIMARY });
    const business = testBusiness();
    // Same tool_call id twice, but the second attempt asks for a DIFFERENT slot.
    // A naive implementation would create a second appointment.
    createMock
      .mockResolvedValueOnce(
        toolCompletion("call_x", "book_appointment", { date_time: "2026-12-01T10:00:00", summary: "AC repair" })
      )
      .mockResolvedValueOnce(
        toolCompletion("call_x", "book_appointment", { date_time: "2026-12-02T15:00:00", summary: "AC repair" })
      )
      .mockResolvedValueOnce(okCompletion("Booked."));

    await handleSmsMessage({
      from: "+15550000003",
      to: "+15550000004",
      body: "book me",
      channel: "SMS",
      business,
    });

    const booked = await bookedCalls(business.business_id);
    expect(booked).toHaveLength(1);
    expect(booked[0].appointment_date_time).toBe("2026-12-01T10:00:00");
  });
});

describe("booking idempotency across deliveries", () => {
  it("does not duplicate an identical booking on a retried webhook", async () => {
    setEnv({ ...PRIMARY });
    const business = testBusiness();
    const args = { date_time: "2026-12-05T09:00:00", summary: "Furnace check" };

    // First delivery.
    createMock
      .mockResolvedValueOnce(toolCompletion("call_a1", "book_appointment", args))
      .mockResolvedValueOnce(okCompletion("Booked."));
    await handleSmsMessage({
      from: "+15550000005",
      to: "+15550000006",
      body: "book me",
      channel: "SMS",
      business,
    });

    // Re-delivery (Twilio retry) — new tool_call id, identical booking details.
    createMock
      .mockResolvedValueOnce(toolCompletion("call_a2", "book_appointment", args))
      .mockResolvedValueOnce(okCompletion("Booked."));
    await handleSmsMessage({
      from: "+15550000005",
      to: "+15550000006",
      body: "book me",
      channel: "SMS",
      business,
    });

    expect(await bookedCalls(business.business_id)).toHaveLength(1);
  });

  it("keeps the tool interaction on ONE provider (never switches mid-conversation)", async () => {
    setEnv({ ...PRIMARY, ...FALLBACK });
    const business = testBusiness();
    let turn = 0;
    createMock.mockImplementation(async (body: { model?: string }) => {
      turn += 1;
      if (turn === 1) {
        return toolCompletion("call_pin", "book_appointment", {
          date_time: "2026-12-09T11:00:00",
          summary: "AC repair",
        });
      }
      // Second turn: the primary now fails. Because the loop is PINNED to the
      // provider that served turn 1, it must surface the error rather than
      // silently switching providers.
      throw quotaError();
    });

    await expect(
      handleSmsMessage({
        from: "+15550000007",
        to: "+15550000008",
        body: "book me",
        channel: "SMS",
        business,
      })
    ).rejects.toBeInstanceOf(AiProvidersUnavailableError);

    // Only the primary model was ever requested — the fallback was not used.
    for (const call of createMock.mock.calls) {
      expect(call[0].model).toBe("gpt-4o-mini");
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Per-provider parameter adaptation (reasoning models vs the fallback)
// ---------------------------------------------------------------------------

const toolsFixture = [
  {
    type: "function" as const,
    function: {
      name: "book_appointment",
      description: "Book an appointment",
      parameters: { type: "object", properties: {} },
    },
  },
];

describe("per-provider parameter adaptation", () => {
  it("applies reasoning-model rules and enables tools via reasoning_effort:none", async () => {
    setEnv({
      AI_PROVIDER_1_TYPE: "openai",
      AI_PROVIDER_1_API_KEY: "sk-test-reasoning-not-a-real-key",
      AI_PROVIDER_1_MODEL: "gpt-6-luna",
    });
    createMock.mockResolvedValue(okCompletion("ok"));

    await chatCompletion({
      messages: userMsg,
      tools: toolsFixture,
      temperature: 0,
      max_tokens: 400,
    });

    const body = createMock.mock.calls[0][0];
    // Chat Completions + tools on a reasoning model requires none.
    expect(body.reasoning_effort).toBe("none");
    // Reasoning models reject a custom temperature and legacy max_tokens.
    expect(body.temperature).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.max_completion_tokens).toBe(400);
  });

  it("leaves non-reasoning OpenAI models untouched", async () => {
    setEnv({ ...PRIMARY }); // gpt-4o-mini
    createMock.mockResolvedValue(okCompletion("ok"));

    await chatCompletion({ messages: userMsg, tools: toolsFixture, temperature: 0, max_tokens: 400 });

    const body = createMock.mock.calls[0][0];
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(400);
    expect(body.max_completion_tokens).toBeUndefined();
  });

  it("never sends OpenAI-only params to the Gemini fallback", async () => {
    setEnv({
      AI_PROVIDER_1_TYPE: "openai",
      AI_PROVIDER_1_API_KEY: "sk-test-reasoning-not-a-real-key",
      AI_PROVIDER_1_MODEL: "gpt-6-luna",
      ...FALLBACK,
    });
    createMock.mockImplementation(async (body: { model?: string }) => {
      if (body.model === "gpt-6-luna") throw quotaError();
      return okCompletion("gemini");
    });

    const { providerId } = await chatCompletion({
      messages: userMsg,
      tools: toolsFixture,
      temperature: 0,
      max_tokens: 400,
    });

    expect(providerId).toBe("provider-2");
    const geminiBody = createMock.mock.calls[1][0];
    // A leftover OpenAI-only knob would be rejected with a 400 by Gemini and
    // (correctly) fail fast — so it must be stripped, not passed through.
    expect(geminiBody.reasoning_effort).toBeUndefined();
    expect(geminiBody.max_completion_tokens).toBeUndefined();
    // Gemini understands these, so they survive.
    expect(geminiBody.temperature).toBe(0);
    expect(geminiBody.max_tokens).toBe(400);
  });
});
