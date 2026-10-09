import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import { getProviders, type AiProvider } from "./config";
import { classifyAiError, isSafetyRefusal } from "./classify";
import { redactMessage } from "@/lib/recovery/redaction";

/**
 * The one shared backend AI client.
 *
 * Every AI workflow calls `chatCompletion()`. Providers are tried in the order
 * declared by AI_PROVIDER_n_* — OpenAI first, Gemini for fallback, then
 * whatever else is configured. Failover only happens for failures that another
 * provider could actually survive (see ./classify).
 *
 * Safety properties:
 *   - Bounded: at most (providers × (1 + MAX_TRANSIENT_RETRIES)) calls. No loop.
 *   - Malformed requests / safety refusals / unknown errors fail fast.
 *   - Errors are redacted before logging; API keys are never logged.
 *   - SDK-level retries are disabled (maxRetries: 0) so we own the retry count.
 */

/** Per-request timeout for a single model call. */
export const AI_REQUEST_TIMEOUT_MS = 30_000;

/** Bounded retries against the SAME provider for transient failures only. */
export const MAX_TRANSIENT_RETRIES = 1;

/** Controlled application-level error when every provider failed. */
export class AiProvidersUnavailableError extends Error {
  readonly category?: string;
  readonly attempts: number;
  constructor(message: string, opts: { cause?: unknown; category?: string; attempts?: number } = {}) {
    super(message);
    this.name = "AiProvidersUnavailableError";
    this.category = opts.category;
    this.attempts = opts.attempts ?? 0;
    if (opts.cause !== undefined) (this as { cause?: unknown }).cause = opts.cause;
  }
}

export type AiChatParams = Omit<ChatCompletionCreateParamsNonStreaming, "model"> & {
  /** Optional override; normally each provider injects its OWN configured model. */
  model?: string;
};

export type AiChatOptions = {
  /**
   * Restrict this call to a single provider (no failover).
   * Used to keep a multi-step tool loop on one provider.
   */
  providerId?: string;
  timeoutMs?: number;
  maxTransientRetries?: number;
  /** Called with the id of the provider that actually served the request. */
  onProvider?: (providerId: string) => void;
};

export type AiChatResult = {
  completion: ChatCompletion;
  providerId: string;
};

const clients = new Map<string, OpenAI>();

/**
 * OpenAI reasoning-model families. Two differences matter for us:
 *   1. they reject a custom `temperature` / the legacy `max_tokens`;
 *   2. Chat Completions supports function calling on them ONLY with
 *      `reasoning_effort: "none"` (per OpenAI's model docs).
 */
const OPENAI_REASONING_MODEL = /^(gpt-6|gpt-5|gpt-4\.1|o1|o3|o4)/i;

/**
 * Adapt request params to the provider that is about to receive them.
 *
 * This exists because an unsupported parameter comes back as HTTP 400, and our
 * classifier deliberately treats 400 as FAIL-FAST — so leaking an OpenAI-only
 * knob (or an OpenAI-only omission) across providers would break the chain
 * instead of failing over cleanly.
 */
function adaptParamsForProvider(
  params: Record<string, unknown>,
  provider: AiProvider
): Record<string, unknown> {
  const out = { ...params };

  if (provider.type === "openai") {
    if (OPENAI_REASONING_MODEL.test(provider.model)) {
      // Reasoning models only support the default sampling temperature.
      delete out.temperature;
      delete out.top_p;
      // `max_tokens` is rejected by reasoning models in favour of
      // `max_completion_tokens`.
      if (out.max_tokens !== undefined && out.max_completion_tokens === undefined) {
        out.max_completion_tokens = out.max_tokens;
        delete out.max_tokens;
      }
      // Chat Completions + tools requires reasoning_effort:"none" on these models.
      if (Array.isArray(out.tools) && out.tools.length > 0) {
        out.reasoning_effort = "none";
      }
    }
    return out;
  }

  // Any non-OpenAI provider (Gemini, …): drop OpenAI-only knobs so the fallback
  // is never rejected with a 400 for a parameter it has never heard of.
  delete out.reasoning_effort;
  delete out.store;
  delete out.max_completion_tokens;
  delete out.seed;
  delete out.logprobs;
  delete out.top_logprobs;

  return out;
}


function clientFor(provider: AiProvider): OpenAI {
  // Key includes the api-key so two OpenAI slots with different keys never
  // share a client. In-memory only; never logged.
  const cacheKey = `${provider.id}|${provider.type}|${provider.baseURL ?? ""}|${provider.apiKey}`;
  let client = clients.get(cacheKey);
  if (!client) {
    client = new OpenAI({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      // We implement our own bounded retry; disable the SDK's so the attempt
      // count stays predictable and observable.
      maxRetries: 0,
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
    clients.set(cacheKey, client);
  }
  return client;
}

/** Structured, redacted observability (repo convention: JSON console lines). */
function aiLog(event: Record<string, unknown>): void {
  try {
    console.log(`[ai] ${JSON.stringify({ ...event, ts: new Date().toISOString() })}`);
  } catch {
    console.log("[ai] (unserializable log event)");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  // attempt is 1-based for the first retry.
  return Math.min(400 * 2 ** (attempt - 1), 4_000) + Math.floor(Math.random() * 200);
}

function lastChoiceFinishReason(completion: ChatCompletion): string | undefined {
  return completion.choices?.[0]?.finish_reason ?? undefined;
}

/**
 * Run a chat completion through the provider chain.
 *
 * @param params  Standard Chat Completions params (omit `model` — each provider
 *                injects its own configured model).
 * @param opts    Optional pin/timeout/retry overrides.
 * @throws AiProvidersUnavailableError when no provider is configured or all fail.
 */
export async function chatCompletion(
  params: AiChatParams,
  opts: AiChatOptions = {}
): Promise<AiChatResult> {
  const allProviders = getProviders();
  const chain = opts.providerId
    ? allProviders.filter((p) => p.id === opts.providerId)
    : allProviders;

  if (chain.length === 0) {
    throw new AiProvidersUnavailableError(
      opts.providerId
        ? `AI provider "${opts.providerId}" is not configured.`
        : "No AI providers are configured. Set AI_PROVIDER_1_TYPE/API_KEY/MODEL or OPENAI_API_KEY.",
      { category: "NO_PROVIDER" }
    );
  }

  const maxTransientRetries = opts.maxTransientRetries ?? MAX_TRANSIENT_RETRIES;
  const timeout = opts.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;

  let attempts = 0;
  let lastError: unknown;
  let lastCategory = "UNKNOWN";

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const isLast = i === chain.length - 1;

    for (let retry = 0; ; retry++) {
      attempts++;
      try {
        const body = adaptParamsForProvider(
          { ...params, model: params.model ?? provider.model },
          provider
        ) as unknown as ChatCompletionCreateParamsNonStreaming;
        const completion = await clientFor(provider).chat.completions.create(body, { timeout });

        const finishReason = lastChoiceFinishReason(completion);
        if (isSafetyRefusal(null, finishReason)) {
          // A safety-filtered completion is a DELIBERATE refusal — return it and
          // let the caller's own fallback handling apply. Never fail over.
          aiLog({
            event: "ai_safety_refusal",
            providerId: provider.id,
            providerType: provider.type,
            finishReason,
          });
        }

        opts.onProvider?.(provider.id);
        return { completion, providerId: provider.id };
      } catch (err) {
        lastError = err;
        const decision = classifyAiError(err);
        lastCategory = decision.category;

        aiLog({
          event: "ai_call_failed",
          providerId: provider.id,
          providerType: provider.type,
          category: decision.category,
          reason: decision.reason,
          failover: decision.failover,
          retry: decision.retry,
          attempt: retry + 1,
          lastProvider: isLast,
          // Redacted; a key or token can never reach the logs.
          message: redactMessage(err, "unknown error").slice(0, 300),
        });

        if (decision.retry && retry < maxTransientRetries) {
          await sleep(backoffMs(retry + 1));
          continue; // bounded retry against the SAME provider
        }

        if (decision.failover) break; // move to the next provider

        // Fail fast: malformed request, safety refusal, or unknown error.
        throw new AiProvidersUnavailableError(
          `AI request failed on provider "${provider.id}" (${decision.category}/${decision.reason}).`,
          { cause: err, category: decision.category, attempts }
        );
      }
    }
  }

  throw new AiProvidersUnavailableError(
    `All ${chain.length} configured AI provider(s) failed (last: ${lastCategory}).`,
    { cause: lastError, category: lastCategory, attempts }
  );
}

/** Test-only: drop memoized OpenAI clients. */
export function resetAiClientForTests(): void {
  clients.clear();
}

