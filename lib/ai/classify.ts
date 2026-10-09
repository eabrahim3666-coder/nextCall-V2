/**
 * Failure classification for the shared AI client.
 *
 * Answers ONE question: what should we do with this provider error?
 *   - failover  -> try the next provider in the chain (never re-hammer the same one)
 *   - retry     -> one bounded retry against the SAME provider first
 *   - neither   -> fail fast (route into the existing recovery engine)
 *
 * Deliberately conservative:
 *   - A 429 is NOT assumed to be "out of credits". Only an explicit
 *     quota/billing signal counts as exhausted credit.
 *   - Malformed requests and unsupported models fail fast so a real bug is
 *     never silently masked by the fallback provider.
 *   - Safety refusals are NEVER re-sent to another provider.
 */

export type AiErrorCategory =
  | "QUOTA_EXHAUSTED"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "NETWORK"
  | "SERVER_ERROR"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "MODEL_NOT_FOUND"
  | "VALIDATION"
  | "SAFETY_REFUSAL"
  | "UNKNOWN";

export type AiFailureDecision = {
  category: AiErrorCategory;
  failover: boolean;
  retry: boolean;
  reason: string;
};

type ErrorShape = {
  status?: number;
  httpStatus?: number;
  code?: string | number;
  type?: string;
  name?: string;
  message?: string;
  error?: unknown;
  response?: { status?: number; data?: unknown };
};

// --- signal patterns -------------------------------------------------------

// Explicit "you are out of credit" signals. Only these count as exhaustion.
const QUOTA_CODE = /insufficient_quota|billing_hard_limit_reached|quota_exceeded|out_of_credits/i;
const QUOTA_MESSAGE =
  /insufficient[_ ]quota|exceeded your current quota|billing hard limit|out of credits|credit balance|quota has been exceeded/i;

// Content / safety refusals — must never be retried against another provider.
const SAFETY_MESSAGE =
  /content[_ ]?policy|content_filter|safety|prohibited_content|responsible ai|harmful/i;

const AUTH_CODE = /invalid_api_key|api_key_invalid|authentication_error|invalid_authentication/i;
const AUTH_MESSAGE = /incorrect api key|invalid api key|api key not valid|unauthenticated|invalid credentials/i;

const MODEL_CODE = /model_not_found|model_not_available|unknown_model|unsupported_model/i;
const MODEL_MESSAGE = /model[^.]{0,40}(not found|does not exist|is not supported|unsupported)|unknown model/i;

const VALIDATION_CODE = /invalid_request_error|invalid_argument|unsupported_parameter|unsupported_value/i;
const VALIDATION_MESSAGE =
  /invalid (request|parameter|argument|value)|unsupported parameter|unsupported value|malformed|context length|maximum context/i;

const TIMEOUT_MESSAGE = /timed? ?out|timeout|deadline exceeded|etimedout|econnaborted|aborted/i;
const NETWORK_MESSAGE =
  /fetch failed|econnrefused|econnreset|eai_again|enotfound|epipe|socket hang up|network error|connection error/i;

// --- extraction ------------------------------------------------------------

function extractStatus(err: unknown): number | undefined {
  const e = err as ErrorShape;
  if (typeof e?.status === "number" && e.status > 0) return e.status;
  if (typeof e?.httpStatus === "number" && e.httpStatus > 0) return e.httpStatus;
  const resp = e?.response;
  if (typeof resp?.status === "number" && resp.status > 0) return resp.status;
  return undefined;
}

function extractCode(err: unknown): string {
  const e = err as ErrorShape;
  const candidates: unknown[] = [e?.code, e?.type];
  const resp = e?.response;
  const data = resp?.data as { code?: unknown; error?: { code?: unknown; type?: unknown } } | undefined;
  candidates.push(data?.code, data?.error?.code, data?.error?.type);
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return "";
}

function extractMessage(err: unknown): string {
  if (typeof err === "string") return err;
  const e = err as ErrorShape;
  const candidates = [e?.message, typeof e?.error === "string" ? e.error : undefined, e?.name];
  return candidates.filter((v): v is string => typeof v === "string").join(" ");
}

/**
 * A safety refusal can arrive as a thrown error OR as a successful completion
 * whose choice was filtered. `finishReason` covers the latter.
 */
export function isSafetyRefusal(err: unknown, finishReason?: string | null): boolean {
  if (typeof finishReason === "string" && /content_filter|safety|prohibited|blocked/i.test(finishReason)) {
    return true;
  }
  const code = extractCode(err);
  const message = extractMessage(err);
  if (/content_filter|prohibited_content|safety/i.test(code)) return true;
  // Only treat message matches as safety when it is NOT a plain validation error.
  return SAFETY_MESSAGE.test(message) && !VALIDATION_CODE.test(code);
}

// --- classification --------------------------------------------------------

export function classifyAiError(err: unknown): AiFailureDecision {
  const status = extractStatus(err);
  const code = extractCode(err);
  const message = extractMessage(err);

  // 1. Safety refusal — never fail over, never retry.
  if (isSafetyRefusal(err)) {
    return { category: "SAFETY_REFUSAL", failover: false, retry: false, reason: "safety_refusal" };
  }

  // 2. Confirmed quota / billing exhaustion — fail over immediately (no retry:
  //    hammering an exhausted account just delays the fallback).
  const quotaSignal = QUOTA_CODE.test(code) || QUOTA_MESSAGE.test(message);
  if (quotaSignal && (status === 429 || status === 402 || status === 403 || status === undefined)) {
    return { category: "QUOTA_EXHAUSTED", failover: true, retry: false, reason: "quota_exhausted" };
  }

  // 3. Authentication / authorization — a different provider may work; never retry.
  if (status === 401 || AUTH_CODE.test(code) || AUTH_MESSAGE.test(message)) {
    return { category: "AUTHENTICATION", failover: true, retry: false, reason: "authentication_error" };
  }
  if (status === 403) {
    return { category: "AUTHORIZATION", failover: true, retry: false, reason: "authorization_error" };
  }

  // 4. Invalid / unsupported model id — fail over (ids differ per provider) and
  //    surface it; a config bug must be visible, not hidden behind a retry.
  if (status === 404 || MODEL_CODE.test(code) || MODEL_MESSAGE.test(message)) {
    return { category: "MODEL_NOT_FOUND", failover: true, retry: false, reason: "model_not_found" };
  }

  // 5. Malformed request / unsupported feature — FAIL FAST. Deterministic; would
  //    burn the fallback too and mask the underlying bug.
  if (status === 400 || status === 422 || VALIDATION_CODE.test(code) || VALIDATION_MESSAGE.test(message)) {
    return { category: "VALIDATION", failover: false, retry: false, reason: "invalid_request" };
  }

  // 6. Transient failures — one bounded retry on the same provider, then fail over.
  if (status === 408 || status === 504 || TIMEOUT_MESSAGE.test(message)) {
    return { category: "TIMEOUT", failover: true, retry: true, reason: "timeout" };
  }
  if (status === 429) {
    return { category: "RATE_LIMIT", failover: true, retry: true, reason: "rate_limited" };
  }
  if (typeof status === "number" && status >= 500 && status < 600) {
    return { category: "SERVER_ERROR", failover: true, retry: true, reason: "provider_server_error" };
  }
  if (NETWORK_MESSAGE.test(message) || /APIConnection/i.test(message)) {
    return { category: "NETWORK", failover: true, retry: true, reason: "network_error" };
  }

  // 7. Unknown — fail fast and let the recovery engine analyse it.
  return { category: "UNKNOWN", failover: false, retry: false, reason: "unknown_error" };
}
