import crypto from "crypto";

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

/**
 * Verify a Telnyx webhook signature (Ed25519 public-key signing).
 *
 * Telnyx signs the string `${timestamp}|${rawBody}` with its Ed25519 private
 * key and sends the base64 signature + unix timestamp in the
 * `telnyx-signature-ed25519` and `telnyx-timestamp` headers. TELNYX_PUBLIC_KEY
 * is the base64 public key from Mission Control → Keys & Credentials.
 * A 5-minute timestamp window rejects replayed deliveries (mirrors the SDK's
 * telnyx/lib/webhooks verifier).
 */
export function verifyTelnyxWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const publicKeyB64 = process.env.TELNYX_PUBLIC_KEY;
  if (!publicKeyB64 || !signature || !timestamp) return false;

  // Timestamp format + 5-minute replay window
  if (!/^\d+$/.test(timestamp)) return false;
  const webhookTime = Number(timestamp);
  if (!Number.isSafeInteger(webhookTime)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - webhookTime) > 300) return false;

  let publicKey: Uint8Array;
  try {
    publicKey = new Uint8Array(Buffer.from(publicKeyB64, "base64"));
  } catch {
    return false;
  }
  if (publicKey.length !== 32) return false;

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
  if (signatureBytes.length !== 64) return false;

  try {
    // Raw 32-byte Ed25519 keys must be wrapped in a DER/SPKI envelope for
    // crypto.verify — the fixed 12-byte prefix below is that envelope.
    const keyObject = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00]),
        publicKey,
      ]),
      format: "der",
      type: "spki",
    });
    // Ed25519 is one-shot: the signature must match `timestamp|rawBody` exactly.
    return crypto.verify(
      null,
      Buffer.from(`${timestamp}|${rawBody}`, "utf8"),
      keyObject,
      signatureBytes
    );
  } catch {
    return false;
  }
}

/**
 * TeXML instruction-fetch requests carry no signature header, so a shared
 * secret is embedded in the webhook URL configured on the TeXML Application
 * (e.g. /api/webhooks/telnyx/voice/txs_<secret>) and compared in constant
 * time. TELNYX_TEXML_WEBHOOK_SECRET must be changed from its placeholder
 * before production traffic is routed.
 */
export function verifyTexmlFetchSecret(secretSegment: string | null): boolean {
  const expected = process.env.TELNYX_TEXML_WEBHOOK_SECRET;
  if (!expected || expected === "change-me-texml-secret") return false;
  if (!secretSegment) return false;
  const provided = `txs_${secretSegment}`;
  const actual = `txs_${expected}`;
  return (
    provided.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(actual))
  );
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
