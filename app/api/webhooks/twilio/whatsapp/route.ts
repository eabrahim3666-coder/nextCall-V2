// WhatsApp inbound traffic runs through the same handler as SMS — it already
// detects the `whatsapp:` prefix end-to-end (channel tagging, `whatsapp:`
// to-number prefixing on replies, per-channel rate limits, AI replies).
// The old whatsapp-inbound stub only stored messages and never replied.
export { POST } from "../sms-inbound/route";
