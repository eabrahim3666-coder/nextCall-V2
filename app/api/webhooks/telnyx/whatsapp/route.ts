// WhatsApp inbound traffic runs through the same Telnyx SMS handler — the
// handler already normalizes `whatsapp:`-prefixed addresses end-to-end
// (channel tagging, per-channel rate limits, AI replies).
export { POST } from "../sms-inbound/route";
