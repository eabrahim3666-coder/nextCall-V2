import { ClusterableError, ErrorCategory, Provider } from "./types";

/**
 * Deterministic error classification.
 *
 * GPT is NEVER consulted for errors that fall into one of the categories
 * classified here. Provider-specific code maps are only included where the
 * mappings are reliable (Twilio official error codes, Google HTTP semantics).
 */

const TWILIO_CODE_MAP: Record<string, ErrorCategory> = {
  // Authentication / authorization
  "20003": "AUTHENTICATION", // Authentication Error - No Auth Token
  "20103": "AUTHORIZATION", // Subaccount not authorized for requested action
  "60002": "AUTHORIZATION", // Account not authorized
  "21660": "AUTHORIZATION", // From number not valid/message-capable for this scope
  "30007": "AUTHORIZATION", // Carrier blocked
  "30008": "AUTHORIZATION", // Carrier blocked (do not retry)
  "30010": "AUTHORIZATION", // Carrier blocked content
  // Rate limits
  "20429": "RATE_LIMIT",
  "14101": "RATE_LIMIT",
  "40004": "RATE_LIMIT", // Frequency cap / subaccount quota
  // Network / timeout
  "11200": "NETWORK",
  "11201": "NETWORK",
  "13224": "NETWORK",
  "11205": "TIMEOUT",
  "11206": "TIMEOUT",
  "12400": "NETWORK",
  "12401": "NETWORK",
  "12402": "NETWORK",
  // Validation / duplicates
  "21559": "VALIDATION",
  "21401": "VALIDATION",
  "21404": "VALIDATION",
  "21450": "VALIDATION",
  "61002": "VALIDATION", // TFV: invalid number
  "61001": "DUPLICATE", // TFV: verification already exists for number
};

function classifyByHttpStatus(status: number): ErrorCategory {
  if (status === 429) return "RATE_LIMIT";
  if (status === 401) return "AUTHENTICATION";
  if (status === 403) return "AUTHORIZATION";
  if (status === 408 || status === 504) return "TIMEOUT";
  if (status >= 500 && status < 600) return "SERVER_ERROR";
  if (status === 400 || status === 422) return "VALIDATION";
  if (status === 404) return "NOT_FOUND";
  if (status === 409 || status === 412) return "DUPLICATE";
  return "UNKNOWN";
}

function classifyByMessage(message: string): ErrorCategory | null {
  const m = message.toLowerCase();
  if (/(rate limit|too many requests|quota exceeded|throttl)/.test(m)) return "RATE_LIMIT";
  if (/(authentication|invalid api key|unauthorized|invalid credentials|no auth token|wrong api key)/.test(m)) return "AUTHENTICATION";
  if (/(not authorized|permission|forbidden|access denied|blocked|not allowed)/.test(m)) return "AUTHORIZATION";
  if (/(timed? ?out|timeout|deadline exceeded|etimedout|econnaborted)/.test(m)) return "TIMEOUT";
  if (/(fetch failed|econnrefused|econnreset|eai_again|network|socket|ehostunreach)/.test(m)) return "NETWORK";
  if (/(already exists|already verified|already completed|duplicate)/.test(m)) return "DUPLICATE";
  if (/(not found|no such|does not exist|unknown number|invalid number)/.test(m)) return "NOT_FOUND";
  if (/(validation|invalid (request|parameter|argument)|bad request|required field|malformed)/.test(m)) return "VALIDATION";
  if (/(internal server error|unavailable|service error|5\d\d)/.test(m)) return "SERVER_ERROR";
  return null;
}

// Google OAuth / API error reason strings (reliable subset)
const GOOGLE_REASON_MAP: Record<string, ErrorCategory> = {
  rateLimitExceeded: "RATE_LIMIT",
  userRateLimitExceeded: "RATE_LIMIT",
  quotaExceeded: "RATE_LIMIT",
  authError: "AUTHENTICATION",
  invalidCredentials: "AUTHENTICATION",
  accessNotConfigured: "AUTHORIZATION",
  forbidden: "AUTHORIZATION",
  insufficientPermissions: "AUTHORIZATION",
  backendError: "SERVER_ERROR",
  internalError: "SERVER_ERROR",
  duplicate: "DUPLICATE",
  notFound: "NOT_FOUND",
  invalidArgument: "VALIDATION",
};

function classifyGoogle(err: ClusterableError): ErrorCategory {
  if (err.httpStatus) return classifyByHttpStatus(err.httpStatus);
  const m = (err.message || "").toLowerCase();
  const reason = /reason\s*[=:]\s*"?([a-zA-Z]+)/.exec(err.message || "")?.[1];
  if (reason && GOOGLE_REASON_MAP[reason]) return GOOGLE_REASON_MAP[reason];
  return classifyByMessage(m) || "UNKNOWN";
}

export function classifyError(err: ClusterableError): ErrorCategory {
  const provider = err.provider || "unknown";
  const code = err.errorCode;

  if (provider === "twilio" && code && TWILIO_CODE_MAP[code]) {
    return TWILIO_CODE_MAP[code];
  }
  if (provider === "google") {
    return classifyGoogle(err);
  }
  if (err.httpStatus) {
    return classifyByHttpStatus(err.httpStatus);
  }
  if (provider === "openai" && code) {
    if (code === "insufficient_quota") return "AUTHORIZATION";
    if (code === "invalid_api_key") return "AUTHENTICATION";
    if (code === "rate_limit_exceeded") return "RATE_LIMIT";
  }
  // Detect network-ish error names regardless of provider
  const name = (err as { message?: string })?.message || "";
  const byMessage = classifyByMessage(name);
  if (byMessage) return byMessage;
  return "UNKNOWN";
}

/** Deterimine whether this category may be auto-retried at all. */
export function autoRetryAllowed(category: ErrorCategory, idempotent: boolean): boolean {
  switch (category) {
    case "RATE_LIMIT":
      return true; // request did not execute — always safe to retry
    case "TIMEOUT":
    case "NETWORK":
    case "SERVER_ERROR":
      return idempotent; // side effects unknown — only retry if op is idempotent
    default:
      return false;
  }
}

export function isProvider(provider: unknown): provider is Provider {
  const providers: Provider[] = [
    "twilio", "google", "paddle", "retell", "openai", "clerk",
    "astra", "resend", "telegram", "meta", "pusher", "unknown",
  ];
  return typeof provider === "string" && (providers as string[]).includes(provider);
}