import crypto from "crypto";
import twilio from "twilio";

export function hasValidSecret(value: string | null, expected: string | undefined): boolean {
  if (!value || !expected) return false;
  const provided = Buffer.from(value);
  const actual = Buffer.from(expected);
  return provided.length === actual.length && crypto.timingSafeEqual(provided, actual);
}

/**
 * Verify a Retell webhook signature (X-Retell-Signature). Retell signs
 * `${rawBody}${timestamp}` with the API key carrying the webhook badge and
 * sends the header as `v={timestamp_ms},d={hex_digest}` — see
 * node_modules/retell-sdk/src/lib/webhook_auth.ts. The 5-minute timestamp
 * window rejects replayed deliveries. Multiple candidate secrets are tried
 * in order (RETELL_WEBHOOK_SECRET first, RETELL_API_KEY as fallback) since
 * either may be the webhook-badge key depending on configuration.
 */
export function verifyRetellSignature(
  rawBody: string,
  signature: string | null,
  secrets: Array<string | undefined>
): boolean {
  if (!signature || !secrets.length) return false;
  const match = /v=(\d+),d=(.*)/.exec(signature);
  if (!match) return false;
  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return false;
  }
  return secrets.some((secret) => {
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${rawBody}${timestamp}`)
      .digest("hex");
    return hasValidSecret(match[2], expected);
  });
}

export function verifyTwilioRequest(
  request: Request,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, signature, request.url, params);
}

export function isSafeWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const hostname = url.hostname.toLowerCase();
    return !(
      hostname === "localhost" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
