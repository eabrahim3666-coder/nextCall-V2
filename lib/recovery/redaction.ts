/**
 * Centralized secret redaction for the recovery system.
 *
 * NEVER send unredacted error payloads to GPT and NEVER persist them in
 * incident records. This module is the single enforcement point.
 */

const REDACTED = "[REDACTED]";

// Global string-level patterns: shapes that are unambiguous secrets.
// Omni-value patterns (JWTs, tokens, SIDs) run BEFORE label patterns so a
// label like "Authorization: Bearer <token>" cannot consume the label while
// leaving the actual token exposed.
const SECRET_PATTERNS: { name: string; re: RegExp }[] = [
  // Bearer tokens
  { name: "Bearer token", re: /bearer\s+[a-z0-9._~+/=-]{6,}/gi },
  // Basic auth
  { name: "Basic auth", re: /basic\s+[a-z0-9+/=]{8,}/gi },
  // JWTs
  {
    name: "JWT",
    re: /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
  },
  // Twilio auth tokens (32 hex chars)
  { name: "Twilio Auth Token", re: /\b[a-f0-9]{32}\b/gi },
  // Twilio / provider SIDs (identifiable prefixes)
  { name: "Provider SID", re: /\b(AC|PN|MG|SM|BC|BU|HH|RA|CA|VA|WA|AP)[0-9a-f]{32}\b/gi },
  // Connection strings
  {
    name: "Connection string",
    re: /\b(mongodb|postgres(ql)?|mysql|astra|grpc|rediss?)(\+srv)?:\/\/[^\s"']+/gi,
  },
  // Paddle keys
  { name: "Paddle key", re: /\bpdl_(test_)?[a-z0-9]{24,}\b/i },
  // Telegram bot tokens
  { name: "Telegram token", re: /\b\d{6,12}:[a-zA-Z0-9_-]{30,}\b/g },
  // Google / OAuth tokens (long base64url strings after a label already handled;
  // also catch bare ya29-style tokens)
  { name: "Google token", re: /\bya29\.[a-zA-Z0-9_-]{10,}\b/g },
  // Authorization / authentication header lines
  {
    name: "Authorization header",
    re: /(authorization|proxy-authorization)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,"']+)/gi,
  },
  // API keys / secrets next to a label
  {
    name: "Keyed secret",
    re: /(api[_-]?key|apikey|client[_-]?secret|access[_-]?token|refresh[_-]?token|auth[_-]?token|webhook[_-]?secret|secret[_-]?key|auth[_-]?secret|password|passwd|pwd|credential|set-cookie|cookie)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,"']+)/gi,
  },
];

function redactString(input: string): string {
  let out = input;
  for (const { re } of SECRET_PATTERNS) {
    try {
      out = out.replace(re, REDACTED);
    } catch {
      // never let redaction itself break recovery
    }
  }
  return out;
}

const SENSITIVE_KEY = /token|secret|password|passwd|apikey|api_key|authorization|cookie|credential|auth|signature|private[_-]?key/i;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function redactValue(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    if (key && SENSITIVE_KEY.test(key) && value.length > 0) {
      return REDACTED;
    }
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v));
  }
  if (isPlainObject(value)) {
    return redactObject(value);
  }
  return value;
}

export function redactObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = redactValue(v, k);
  }
  return out;
}

/** Redact an error-like object recursively (safe for any provider error shape). */
export function redactError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: redactString(error.name || "Error"),
      message: redactString(error.message || String(error)),
      stack: error.stack ? redactString(error.stack).slice(0, 4000) : undefined,
    };
  }
  if (isPlainObject(error)) {
    return redactObject(error);
  }
  return { message: redactString(String(error)) };
}

/** Compact redacted one-line error description for storage / AI input. */
export function redactMessage(error: unknown, fallback = "Unknown error"): string {
  if (typeof error === "string") return redactString(error).slice(0, 2000);
  if (error instanceof Error) return redactString(error.message || fallback).slice(0, 2000);
  if (isPlainObject(error)) {
    const msg =
      (typeof error.message === "string" && error.message) ||
      (typeof error.error === "string" && error.error) ||
      (typeof error.description === "string" && error.description) ||
      fallback;
    return redactString(msg).slice(0, 2000);
  }
  return redactString(fallback).slice(0, 2000);
}