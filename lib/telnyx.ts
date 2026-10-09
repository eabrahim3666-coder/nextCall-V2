import Telnyx from "telnyx";

// Single shared Telnyx client. Telnyx has no subaccounts — every business's
// number lives on this one account, scoped by the number itself.
//
// TELNYX_PUBLIC_KEY (Mission Control → Keys & Credentials → Public Key) is the
// base64 Ed25519 public key used to verify inbound webhooks. It is NOT a
// secret; it authenticates Telnyx to us.
const apiKey = process.env.TELNYX_API_KEY || "";

const telnyxClient = new Telnyx({ apiKey });

export default telnyxClient;

export function isTelnyxConfigured(): boolean {
  return apiKey.length > 0;
}
