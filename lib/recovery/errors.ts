import {
  NormalizedError,
  Provider,
  Severity,
  ErrorCategory,
} from "./types";
import { redactError, redactMessage } from "./redaction";
import { classifyError } from "./classifier";

/**
 * Normalize any provider-specific error into a single redacted internal
 * representation. Handles Error objects, fetch/axios-style failures, Twilio
 * SDK errors, Google/Gaxios errors, OpenAI errors, DataAPI (Astra) errors and
 * plain provider response bodies.
 */

type ProviderErrorShape = {
  provider?: Provider;
  operation?: string;
  businessId?: string;
  userId?: string;
  status?: number;
  httpStatus?: number;
  code?: number | string;
  errorCode?: string;
  message?: string;
  name?: string;
  moreInfo?: string;
  details?: unknown;
  requestId?: string;
  providerRequestId?: string;
  errors?: unknown;
  cause?: unknown;
  response?: unknown;
  error?: string | Record<string, unknown>;
  description?: string;
  /** Caller-set marker: provider accepted the request but rejected it semantically. */
  businessFailure?: boolean;
};

const BUSINESS_REJECTION_STATUS = /^(rejected|reject|declined|failed|cancelled|canceled|suspended)$/i;
const BUSINESS_REJECTION_MESSAGE = /(rejected|declined|not approved|not verified)/i;

/**
 * Detect a business failure: the request was technically delivered (HTTP 2xx)
 * but the provider rejected it semantically (REJECTED / declined / malformed /
 * missing fields). Returns true only for explicit caller markers or clear
 * 2xx + rejection combinations — never guesses on technical errors.
 */
export function detectBusinessFailure(err: unknown): boolean {
  const e = err as ProviderErrorShape;
  if (e?.businessFailure === true) return true;

  const httpStatus = pickHttpStatus(err);
  if (httpStatus !== undefined && (httpStatus < 200 || httpStatus >= 300)) {
    return false;
  }

  const data =
    e?.response &&
    typeof e.response === "object" &&
    (e.response as { data?: Record<string, unknown> }).data;
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    const statusField =
      typeof record.status === "string"
        ? record.status
        : typeof record.result === "string"
          ? record.result
          : undefined;
    if (statusField && BUSINESS_REJECTION_STATUS.test(statusField)) return true;
  }

  const message = `${pickMessage(err, "")} ${typeof e?.error === "string" ? e.error : ""}`;
  if (httpStatus === undefined || (httpStatus >= 200 && httpStatus < 300)) {
    if (BUSINESS_REJECTION_MESSAGE.test(message)) return true;
  }

  return false;
}

function pickProvider(err: unknown): Provider {
  const e = err as ProviderErrorShape;
  const msg = `${e?.message || ""} ${e?.name || ""} ${typeof e?.error === "string" ? e.error : ""}`.toLowerCase();
  if (e?.code !== undefined || /twilio/i.test(msg)) return "twilio";
  if (/gaxios|googleapis|google/i.test(msg)) return "google";
  if (/retell/i.test(msg)) return "retell";
  if (/openai|insufficient_quota|invalid_api_key/i.test(msg)) return "openai";
  if (/dataapi|cassandra|astra/i.test(msg)) return "astra";
  if (/paddle/i.test(msg)) return "paddle";
  if (/clerk/i.test(msg)) return "clerk";
  if (/resend/i.test(msg)) return "resend";
  if (/telegram/i.test(msg)) return "telegram";
  return "unknown";
}

function pickHttpStatus(err: unknown): number | undefined {
  const e = err as ProviderErrorShape;
  if (typeof e?.status === "number" && e.status > 0) return e.status;
  if (typeof e?.httpStatus === "number" && e.httpStatus > 0) return e.httpStatus;
  const resp = e?.response as { status?: number; data?: unknown } | undefined;
  if (typeof resp?.status === "number") return resp.status;
  return undefined;
}

function pickCode(err: unknown): string | undefined {
  const e = err as ProviderErrorShape;
  if (e?.code !== undefined) return String(e.code);
  if (e?.errorCode) return String(e.errorCode);
  const resp = e?.response as { data?: { code?: unknown; error?: { code?: unknown } } } | undefined;
  const data = resp?.data as { code?: unknown } | undefined;
  if (data?.code !== undefined) return String(data.code);
  return undefined;
}

function pickMessage(err: unknown, fallback: string): string {
  const e = err as ProviderErrorShape;
  const candidates = [
    e?.message,
    typeof e?.error === "string" ? e.error : undefined,
    e?.description,
    typeof e?.errors === "string" ? e.errors : undefined,
  ].filter((v): v is string => typeof v === "string" && v.length > 0);
  return candidates[0] || fallback;
}

function pickRequestId(err: unknown): string | undefined {
  const e = err as ProviderErrorShape;
  return e?.providerRequestId || e?.requestId || undefined;
}

function isRetryableByCategory(category: ErrorCategory): boolean {
  return ["RATE_LIMIT", "TIMEOUT", "NETWORK", "SERVER_ERROR"].includes(category);
}

export function normalizeError(input: {
  error: unknown;
  provider?: Provider;
  operation: string;
  businessId?: string;
  userId?: string;
  context?: Record<string, unknown>;
}): NormalizedError {
  const raw = input.error;
  const redacted = redactError(raw);
  const provider = input.provider || pickProvider(raw);
  const httpStatus = pickHttpStatus(raw);
  const errorCode = pickCode(raw);
  const category = classifyError({
    provider,
    operation: input.operation,
    httpStatus,
    errorCode,
    message: pickMessage(raw, ""),
  });
  const businessFailure = detectBusinessFailure(raw);
  const severity: Severity =
    businessFailure
      ? "MEDIUM"
      : category === "AUTHENTICATION" || category === "AUTHORIZATION" || category === "UNKNOWN"
        ? "HIGH"
      : category === "SERVER_ERROR"
        ? "MEDIUM"
        : category === "RATE_LIMIT" || category === "TIMEOUT" || category === "NETWORK"
          ? "MEDIUM"
          : "LOW";

  const normalized: NormalizedError = {
    provider,
    operation: input.operation,
    httpStatus,
    errorCode,
    message: redactMessage(raw, "Unknown error"),
    providerRequestId: pickRequestId(raw),
    retryable: !businessFailure && isRetryableByCategory(category),
    category,
    severity,
    businessFailure: businessFailure || undefined,
    timestamp: new Date().toISOString(),
    businessId: input.businessId,
    userId: input.userId,
    sanitizedStack: typeof redacted.stack === "string" ? redacted.stack : undefined,
    metadata: {
      ...(input.context || {}),
      name: typeof redacted.name === "string" ? redacted.name : undefined,
    },
  };

  // Strip undefined keys for cleaner storage
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(normalized)) {
    if (v !== undefined) out[k] = v;
  }
  return out as unknown as NormalizedError;
}