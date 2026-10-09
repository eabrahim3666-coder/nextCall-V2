// nextCall - single-page user activity poster (strict 2-color: white bg + black ink)
// generates docs/nextCall-user-activity-poster.html (inline SVG) for PDF printing
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "nextCall-user-activity-poster.html");

const INK = "#101010";
const BG = "#FFFFFF";
const FONT = "'Segoe UI', Helvetica, Arial, sans-serif";

// ---------------- content ----------------
const PHASES = [
  {
    num: "01", title: "LANDING & SIGN-IN", caption: "public routes · no auth",
    chains: [[
      { id: "p1_open", t: "Open the marketing site /", d: "Client component: SceneStack of 11 scroll scenes, Lenis smooth scroll, ScrollProgress bar, Section3D depth." },
      { id: "p1_nav", t: "Jump to a section", d: "Desktop anchor links + SmoothScroll; every scene wrapper id is unique so getElementById stays unambiguous." },
      { id: "p1_ref", t: "Arrive via referral link ?ref=CODE", d: "Read via URLSearchParams after mount to avoid a hydration mismatch; the code rides into the Paddle checkout custom_data." },
    ], [
      { id: "p1_contact", t: "Ask a question / request a feature", d: "POST /api/contact: honeypot field, 3 req/IP/min limit, escaped HTML email via Resend. POST /api/feature-request stores the idea." },
      { id: "p1_legal", t: "Read privacy / terms / pricing policy", d: "/privacy, /terms, /pricing-policy, /google-user-data — public on purpose: Paddle and Google both require disclosure pages." },
      { id: "p1_signup", t: "Sign up or sign in", d: "Clerk modal from ClerkProvider in app/layout.tsx; the session cookie authorises every protected route and API call." },
    ], [
      { id: "p1_mw", t: "Edge gate: Clerk middleware", d: "proxy.ts (Next 16's renamed middleware). Public allowlist; everything else calls auth().protect() before it runs." },
      { id: "p1_layout", t: "Server guard on the dashboard shell", d: "dashboard/layout.tsx: auth() → redirect without a session; loads the tenant doc, trial state and the minutes maths." },
      { id: "p1_gate", t: "Access gate picks one of four states", d: "No doc → OnboardingFlow · Paddle success → Waiting · Trial over → TrialEndedScreen · Not active → Paywall · Active → dashboard." },
    ]],
    branches: [["p1_signup", "p1_mw"]],
  },
  {
    num: "02", title: "ONBOARDING", caption: "one form · before any payment",
    chains: [[
      { id: "p2_form", t: "Fill the onboarding wizard", d: "Business name, owner name, phone, type, industry, hours, services and free-form notes." },
      { id: "p2_post", t: "POST /api/business/onboard", d: "Owner email read server-side from Clerk; document upserted on business_id = userId, so a resubmit can never create a second tenant." },
      { id: "p2_doc", t: "businesses doc is created", d: "Status pending, six answers compiled into knowledge_base_text, referral_code generated, counters zeroed — the root every feature keys off." },
    ]],
    branches: [],
  },
  {
    num: "03", title: "BILLING & ACTIVATION", caption: "Paddle → tenant goes live",
    chains: [[
      { id: "p3_choose", t: "Choose a plan in the Paywall", d: "Trial 3 days / 50 min · standard 200 min $299 · premium 500 min $399 — plus an optional referral code." },
      { id: "p3_checkout", t: "POST /api/checkout/paddle", d: "Plan mapped to a PADDLE_*_PRICE_ID on the server, so no client can post a cheaper price id. custom_data carries user, plan, ref." },
      { id: "p3_txn", t: "Paddle overlay checkout", d: "Paddle creates the transaction and opens it as an overlay — card data never touches our servers." },
      { id: "p3_paid", t: "Pay, return ?paddle=success", d: "On success Paddle redirects back with a transaction id." },
    ], [
      { id: "p3_wait", t: "Waiting screen polls activation", d: "GET /api/business/status → verifyPaidTransaction() checks Paddle directly and requires a session match + completed status." },
      { id: "p3_active", t: "Tenant goes active", d: "Status active, plan_type, minutes_limit 50/200/500, trial window, paddle_customer_id + subscription id stored." },
      { id: "p3_hook", t: "POST /api/webhooks/paddle", d: "HMAC signature with a 5-min replay window; webhook_events ledger gives idempotency. This is the AUTHORITATIVE activation." },
      { id: "p3_branch", t: "Webhook event router", d: "created|activated → activate · updated → reconcile plan from price id · canceled/expired → cancelled + 30-day deletion · minutes → $inc." },
    ], [
      { id: "p3_prov", t: "provisionTwilioNumber()", d: "Reuse the deterministic subaccount (a retry never bills twice) or create it; buy a US toll-free number with voice + SMS webhooks wired." },
      { id: "p3_store", t: "Subaccount + number stored", d: "twilio_subaccount_sid, twilio_number, twilio_numbers[]; a failure writes PROVISIONING_FAILED so later code can self-heal." },
      { id: "p3_ref", t: "Referral bonus credited", d: "+40 / +70 minutes via an atomic not-yet-claimed guard — concurrent events cannot double-credit; self-referral blocked; founder alerted." },
      { id: "p3_minutes", t: "Buy extra minutes mid-cycle", d: "POST /api/checkout/paddle-minutes: 50-min packs capped at plan limit, blocked on trial. Calls PAUSE at the limit — no overage billing." },
    ], [
      { id: "p3_portal", t: "Manage billing / cancel", d: "POST /api/billing/portal opens the Paddle customer portal; cancelling → 30-day grace, then the cleanup cron closes everything." },
      { id: "p3_trial", t: "Trial runs out — nothing to click", d: "isTrialExpired() rejects calls and texts on the first request past trial_ends_at; the hourly cron flips status and emails the owner." },
    ]],
    branches: [["p3_branch", "p3_minutes"]],
  },
  {
    num: "04", title: "DASHBOARD HOME", caption: "what you see every morning",
    chains: [[
      { id: "p4_open", t: "Open /dashboard", d: "RSC reads the business doc + latest 50 calls; withRetry degrades a flaky Astra read to an empty list instead of a 500." },
      { id: "p4_kpi", t: "Read the KPI cards", d: "Calls, minutes, appointments, hot leads — all derived from the calls array the RSC already loaded; zero extra queries." },
      { id: "p4_charts", t: "Read the charts", d: "7-day call volume + sentiment donut; premium swaps in PremiumAnalytics: revenue, average job value, quote tracking." },
      { id: "p4_list", t: "Scan the recent calls list", d: "Five most recent calls with sentiment / lead / appointment / emergency badges, deep-linking into /dashboard/calls." },
    ], [
      { id: "p4_numbers", t: "Check your AI numbers", d: "Rendered from twilio_numbers, filtering out the PROVISIONING_FAILED sentinel so the owner never sees a fake number." },
      { id: "p4_bell", t: "Open the notification bell", d: "GET /api/notifications (50 latest + unread), PATCH mark_read / mark_all_read, DELETE single. 8 types incl. hot_lead, emergency." },
      { id: "p4_minutes", t: "Watch the minutes counter", d: "Used / limit from the business doc; at the limit it points at Settings → Billing to buy a pack or upgrade." },
      { id: "p4_status", t: "Check the AI status pill", d: "Lit only when status active ∧ total_minutes_used < limit — the same condition the inbound call route enforces." },
    ], [
      { id: "p4_setup", t: "Work the setup checklist", d: "10 weighted items (profile … job value) deep-linking to settings?focus=…; the widget hides itself at 100%." },
      { id: "p4_feed", t: "Watch the live activity feed", d: "Subscribes to Pusher private-business-{id}: incoming_call, ai_answered, appointment_confirmed, hot_lead, emergency, minute alerts…" },
      { id: "p4_auth", t: "Realtime channel authorisation", d: "POST /api/pusher/auth signs only private-business-{userId} for the signed-in user — no tenant can subscribe to another's feed." },
      { id: "p4_nav", t: "Navigate Calls / Settings / Docs", d: "Desktop NavLinks + MobileNav; footer links to /dashboard/docs, /dashboard/support and the in-app legal pages." },
    ]],
    branches: [],
  },
  {
    num: "05", title: "CALL LOGS & JOBS", caption: "the money screen",
    chains: [[
      { id: "p5_open", t: "Open /dashboard/calls", d: "CallLogsTable renders the 50 most recent calls; rows are keyboard-accessible with duration, source and state badges." },
      { id: "p5_read", t: "Read a transcript / summary", d: "Everything the analyst model extracted sits on the call: transcript, summary, sentiment, lead_quality, quote, recording_url." },
      { id: "p5_flag", t: "Flag or unflag a call", d: "POST /api/calls/toggle-flag flips is_flagged — a shortlist of leads worth chasing." },
    ], [
      { id: "p5_done", t: "Mark the job done", d: "Sets job_status done, feeds the AI context list, then fires the review request (email first, SMS fallback). A second click → 409." },
      { id: "p5_noshow", t: "Mark a no-show", d: "job_status no_show stops the 24h auto-completion cron treating it as completed — no review request goes out." },
      { id: "p5_auto", t: "Nothing clicked — the cron closes the loop", d: "The hourly follow-up finds booked jobs 24h past and still pending, marks them auto_done and sends the review request." },
    ]],
    branches: [],
  },
  {
    num: "06", title: "SETTINGS & KNOWLEDGE", caption: "the tabs that change AI behaviour",
    chains: [[
      { id: "p6_settings", t: "Open /dashboard/settings", d: "SettingsForm honours ?focus=business|knowledge|greeting|routing|integrations|sms|billing — the checklist's deep links." },
      { id: "p6_save", t: "POST /api/business/update-settings", d: "One write path for the whole profile; validates before storing: timezone must round-trip Intl, review link https, webhook SSRF guard." },
      { id: "p6_profile", t: "Edit name, type, service area, owner phone", d: "Feeds the AI's answers, the owner-SMS target, the dashboard header and every outgoing email signature." },
      { id: "p6_hours", t: "Set hours, services, exclusions, FAQs", d: "Compiled into knowledge_base_text — the exact string injected into the voice prompt and the SMS brain." },
    ], [
      { id: "p6_greeting", t: "Set greeting tone, text and AI name", d: "Sent as Retell dynamic variables so the AI introduces itself the way the owner wants on every call." },
      { id: "p6_routing", t: "Toggle routing rules", d: "forward_emergency, hot-lead notify, missed-call SMS, follow-ups, summaries, reminders — plan-gated again on the server." },
      { id: "p6_emergency", t: "Define what counts as an emergency", d: "Injected into the agent prompt; drives the transfer_call tool + the emergency webhook fan-out." },
      { id: "p6_review", t: "Set review link + average job value", d: "review_link is the destination of every review request; avg_job_value (premium) unlocks the revenue analytics." },
    ], [
      { id: "p6_zapier", t: "Add a Zapier / automation webhook", d: "Premium only; stored only after isSafeWebhookUrl() proves public https — blocking SSRF from our own servers." },
      { id: "p6_numbers", t: "Add or remove a phone number", d: "POST /api/numbers/add: premium, max 3, self-heals a missing line first; remove releases it back to Twilio." },
      { id: "p6_code", t: "Share your referral code", d: "POST /api/business/referral-code returns the onboarding code; a referral signup credits +40 / +70 minutes back here." },
      { id: "p6_tab", t: "Open the SMS compliance tab", d: "GET /api/sms/compliance: 20+ field prefilled Toll-Free Verification form + status, lazily refreshed from Twilio at most every 6h." },
    ], [
      { id: "p6_submit", t: "POST /api/sms/compliance", d: "Validates every field, then submitTollfreeVerification(); Twilio auth failures retry through the recovery engine, not a dead form." },
      { id: "p6_state", t: "Twilio reviews the verification", d: "pending → approved | rejected with reasons mirrored back. This single flag unlocks ALL outbound texting." },
    ]],
    branches: [],
  },
  {
    num: "07", title: "INTEGRATIONS (OAUTH)", caption: "connect the tools you already use",
    chains: [[
      { id: "p7_gauth", t: "Click Connect Google", d: "CSRF state in an httpOnly cookie; offline access + consent to force a refresh token; calendar + business scopes." },
      { id: "p7_gcb", t: "Google consent → callback", d: "State compared and deleted, code exchanged, refresh token + account email stored, redirected back ?connected=1." },
      { id: "p7_guse", t: "What the token unlocks", d: "Calendar events from booked appointments (all plans) + hourly Google Reviews sync with AI replies (paid). Token faults auto-heal." },
      { id: "p7_mauth", t: "Connect Facebook / Instagram", d: "CSRF state cookie + scopes for pages, messaging, Instagram messages and engagement." },
    ], [
      { id: "p7_mcb", t: "FB dialog → callback", d: "Short-lived → long-lived token, page list with portfolio fallback, primary page token, Instagram business account + picture stored." },
      { id: "p7_disc", t: "Disconnect an integration", d: "POST …/disconnect clears stored tokens — calendar writes and DM replies stop instantly, cards show disconnected." },
    ]],
    branches: [],
  },
  {
    num: "08", title: "SUPPORT CHAT", caption: "you ↔ nextCall staff",
    chains: [[
      { id: "p8_open", t: "Open the chat widget", d: "Premium tenants; history from GET /api/chat/history; POST /api/chat/read clears the unread badge." },
      { id: "p8_send", t: "Send a message or a photo", d: "POST /api/chat/send: 2000-char cap, 2MB photo cap, server-side message ids so ordering survives retries." },
      { id: "p8_tg", t: "Staff pinged on Telegram", d: "notifyAdminChat() sends the escaped message and stores the returned Telegram message_id on the message — the reply join key." },
      { id: "p8_store", t: "Thread upserted + pushed live", d: "conversations{kind:support} gets $push, unread reset, and chat:new fires on private-admin-chat so /admin/chat animates instantly." },
    ], [
      { id: "p8_admin", t: "Staff replies in /admin/chat", d: "POST /api/admin/chat/reply appends an owner-role message and notifies — the widget receives it in real time, no polling." },
      { id: "p8_tgreply", t: "Staff replies inside Telegram instead", d: "POST /api/webhooks/telegram: secret-token + sender check, reply_to_message_id resolved back to the thread, then pushed to the widget." },
    ]],
    branches: [["p8_store", "p8_admin"]],
  },
  {
    num: "09", title: "AI ANSWERS THE PHONE", caption: "the core product · customer-triggered",
    chains: [[
      { id: "p9_voice", t: "Customer calls your AI number", d: "Twilio hits POST /api/webhooks/twilio/inbound; X-Twilio-Signature validated so nobody spoofs a call into your minutes." },
      { id: "p9_guard", t: "Four guards before any AI runs", d: "Agent id missing → loud alert · tenant not found → polite TwiML · trial expired → unavailable + notification · minutes spent → missed-lead alert." },
      { id: "p9_register", t: "registerPhoneCall + tenant prompt", d: "Retell registered with business_id metadata and dynamic variables — multi-tenant isolation is per-call, not per-deployment." },
      { id: "p9_prompt", t: "Voice prompt assembled", d: "Knowledge base, greeting, tone, routing rules, emergency definition, live name + service area — bound into this single call." },
    ], [
      { id: "p9_sip", t: "TwiML dials Retell over SIP", d: "The route answers with Dial Sip sip:{call_id}@sip.retellai.com — which is why the emergency path rewrites live TwiML." },
      { id: "p9_emerg", t: "Emergency — the agent calls transfer_call", d: "HMAC-verified webhook: urgent SMS + live dashboard toast, then the LIVE call's TwiML rewritten to bridge the owner; fail → founder paged." },
      { id: "p9_end", t: "Customer hangs up", d: "POST /api/webhooks/retell/call-ended: signature + in-flight window + call_id dedupe — a retry can never double-count minutes." },
      { id: "p9_analyse", t: "One model call turns talk into data", d: "gpt-4o-mini in JSON mode: summary, sentiment, lead_quality, appointment, email + name, is_emergency, duration, quote + amount." },
    ], [
      { id: "p9_record", t: "Call row written + minutes debited", d: "$inc total_minutes_used + calls atomically (race-safe); the full call document is stored with job_status pending." },
      { id: "p9_fanout", t: "Post-call automations fire in parallel", d: "Calendar event, Zapier (premium), follow-up email, hot-lead + emergency alerts, missed-call SMS <10s, 80/90/100% minute alerts — all guarded." },
      { id: "p9_calendar", t: "Google Calendar event created", d: "Naive local time converted via business_timezone; midnight → 10:00 local; a 401/403 refreshes the token and retries once." },
    ]],
    branches: [],
  },
  {
    num: "10", title: "AI ANSWERS TEXT & DMs", caption: "SMS · WhatsApp · Messenger · Instagram",
    chains: [[
      { id: "p10_sms", t: "Customer texts your number", d: "POST /api/webhooks/twilio/sms-inbound, signature verified. Same handler serves WhatsApp — prefix stripped, re-applied on the reply." },
      { id: "p10_optout", t: "TCPA opt-out runs FIRST", d: "STOP-family keywords confirmed and recorded before any gate; START clears. A customer can always opt out, whatever the account state." },
      { id: "p10_throttle", t: "Trial + abuse gates", d: "Expired trial → one polite 'no longer active' reply; otherwise 25 messages/hour per customer stops a runaway loop burning AI credits." },
      { id: "p10_brain", t: "SMS brain with real tools", d: "gpt-4o-mini + knowledge + thread history can book, confirm, reschedule or cancel appointments — writing straight to the calls collection." },
    ], [
      { id: "p10_reply", t: "Reply through one choke point", d: "sendBusinessSms() enforces three things at once: TFV approved, not opted out, and the business's OWN subaccount as sending scope." },
      { id: "p10_gate", t: "Gated until TFV is approved", d: "Before Toll-Free Verification approval, sends are logged and skipped — which is why the compliance tab is step 8 of the checklist." },
      { id: "p10_meta", t: "Customer DMs your Facebook / Instagram", d: "POST /api/webhooks/meta/inbound: x-hub-signature-256 verified, per-sender idempotency, matched on meta_page_id, premium only." },
      { id: "p10_buffer", t: "3-second human buffer", d: "Waits 3s and re-reads the thread: a newer message aborts the reply — three typed lines get ONE answer, never three." },
    ], [
      { id: "p10_mbrain", t: "JSON brain + hard safety overrides", d: "Intent, sentiment, confidence, action + reply; then deterministic overrides: low confidence, anger or emergency always escalates." },
      { id: "p10_msend", t: "Reply sent through the Graph API", d: "Reply + new conversation state persisted, then posted to the page's send endpoint with the stored page token." },
      { id: "p10_review", t: "Review request after the work is done", d: "sendReviewRequest(): email first, SMS fallback — the SMS path TFV-gated like everything else; only when a review link is configured." },
      { id: "p10_remind", t: "Appointment reminder — reply 1 / 2 / 3", d: "Hourly cron emails then texts the customer in the business's timezone, marked sent so it never repeats; replies hit the booking tools." },
    ]],
    branches: [],
  },
  {
    num: "11", title: "AUTOMATION & REALTIME", caption: "what happens while you are not looking",
    chains: [[
      { id: "p11_cron", t: "Hourly jobs (GitHub Actions)", d: "Bearer CRON_SECRET (timing-safe compare) hits appointment-reminders, job-done-followup, sync-reviews and expire-trials." },
      { id: "p11_daily", t: "Daily + weekly jobs", d: "cleanup-cancelled 00:00 closes the Twilio subaccount FIRST (skips delete on failure), daily-summary 03:00, weekly-summary Monday." },
      { id: "p11_reviews", t: "Google Reviews sync + AI replies", d: "locations → v4 reviews; unreplied ones get a short SEO-aware gpt-4o-mini reply PUT back to Google; also exposed to n8n behind x-api-key." },
    ], [
      { id: "p11_email", t: "Resend email fan", d: "Daily/weekly summaries, trial + minute-limit notices, customer follow-ups, reminders, review requests — trouble never breaks a flow." },
      { id: "p11_pusher", t: "Pusher realtime", d: "private-business-{id} and private-admin-chat; notifyActivity()/notifyChat() never throw — an outage degrades to no toasts, never a failed call." },
      { id: "p11_telegram", t: "Telegram ops bridge", d: "One bot, two jobs: the owner-support bridge and the system alarm channel — provisioning failures, bridge faults, HIGH/CRITICAL incidents." },
      { id: "p11_n8n", t: "n8n boss alerts", d: "Hot-lead and emergency events POSTed to N8N_BOSS_ALERT_URL for fan-out to any other channel the owner runs." },
    ], [
      { id: "p11_idem", t: "Idempotency, retries and caps", d: "webhook_events dedupes Retell, Twilio, Paddle, Meta, Telegram; contact form rate-limited; SMS capped; withRetry wraps flaky Astra reads." },
    ]],
    branches: [],
  },
  {
    num: "12", title: "ADMIN, SECURITY & SELF-HEALING", caption: "cross-cutting · always on",
    chains: [[
      { id: "p12_login", t: "Open /admin", d: "Only privateMetadata.role=admin or ADMIN_EMAILS — backend-set signals; publicMetadata is never a trust anchor. Others → /dashboard." },
      { id: "p12_kpi", t: "Admin overview", d: "Tenants, usage, minutes and margin per plan via lib/costing, plus the incident counters." },
      { id: "p12_inbox", t: "Support inbox", d: "Threads from /api/admin/chat/list + /messages; the layout badge counts unread (read_by_admin_at: null)." },
      { id: "p12_inc", t: "Incident console", d: "Filtered list (free text, provider, severity, status, operation, dates) + a detail page per incident." },
    ], [
      { id: "p12_act", t: "Act on an incident", d: "retry / resolve / recover / dismiss / requires_action. Retry only runs REGISTERED executors, refuses terminal states, inflight-guarded." },
      { id: "p12_engine", t: "Recovery engine wraps provider calls", d: "executeWithRecovery(): normalize + redact, deterministic classification (no AI), bounded retry, then a policy-checked action. Depth ≤ 1." },
      { id: "p12_ai", t: "AI is a consultant, never an actor", d: "Only unknown errors reach gpt-4o-mini, within a budget + fingerprint cache; the answer must be a registry id re-checked by policy — else fail closed." },
      { id: "p12_trail", t: "Incident + audit trail", d: "Incidents aggregate by sha256 fingerprint with occurrence counts, a timeline, and every policy evaluation kept as evidence." },
    ], [
      { id: "p12_sig", t: "Every inbound edge verifies its sender", d: "Twilio signature, Retell HMAC, Paddle HMAC, Meta x-hub-signature-256, Telegram secret token — all timing-safe, all fail closed." },
      { id: "p12_abuse", t: "SSRF, spam and prompt-safety guards", d: "Private-host block on user webhooks, honeypot + rate-limited contact form, deterministic overrides above every AI layer." },
      { id: "p12_health", t: "Operational surfaces", d: "GET /api/health for uptime monitors, structured [recovery] JSON logs, and a one-time warning if recovery state falls back to memory." },
    ]],
    branches: [],
  },
];

// cross-phase links: [from, to, label, side]
const CROSS = [
  ["p1_ref", "p3_ref", "referral code rides into checkout", "R"],
  ["p3_trial", "p9_guard", "trial + minute state enforced at the edge", "L"],
  ["p3_store", "p10_sms", "the provisioned line is what customers text", "R"],
  ["p4_setup", "p6_settings", "checklist deep-links into settings", "L"],
  ["p4_status", "p9_guard", "same active / under-limit rule", "L"],
  ["p6_hours", "p9_prompt", "settings become the voice script", "L"],
  ["p6_submit", "p10_reply", "TFV approval gates every outbound text", "L"],
  ["p7_guse", "p9_calendar", "the stored refresh token creates events", "R"],
  ["p7_mcb", "p10_meta", "the page token sends Messenger / IG replies", "L"],
  ["p5_done", "p10_review", "job done fires the review request", "R"],
  ["p11_cron", "p5_auto", "crons close jobs you never marked", "L"],
  ["p12_inbox", "p8_open", "a staff reply lands in your chat widget", "R"],
];

// ---------------- layout ----------------
const W = 3160;
const OUTER = 64;          // outer margin
const GUTW = 96;           // gutter between band edge and page edge
const BAND_X = OUTER + GUTW;
const BAND_W = W - 2 * BAND_X;
const PAD = 26;            // band inner padding
const COLS = 4;
const GAP = 26;            // gap between boxes
const BOX_W = Math.floor((BAND_W - 2 * PAD - (COLS - 1) * GAP) / COLS);
const RGAP = 56;           // gap between chain rows (elbow channel)
const TITLE_H = 64;        // band header zone
const HEADER_H = 300;      // poster header
const BAND_GAP = 44;       // gap between bands

const LINE_H = 20;         // desc line height
const TITLE_LH = 27;       // title line height
const VPAD = 13;           // box vertical padding

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) cur = (cur + " " + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
// rounded orthogonal polyline
function rpath(pts, r = 12) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, d1 / 2, d2 / 2);
    const ux1 = (x1 - x0) / (d1 || 1), uy1 = (y1 - y0) / (d1 || 1);
    const ux2 = (x2 - x1) / (d2 || 1), uy2 = (y2 - y1) / (d2 || 1);
    const ax = x1 - ux1 * rr, ay = y1 - uy1 * rr;
    const bx = x1 + ux2 * rr, by = y1 + uy2 * rr;
    d += ` L ${ax} ${ay} Q ${x1} ${y1} ${bx} ${by}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last[0]} ${last[1]}`;
  return d;
}

const nodePos = new Map(); // id -> {x,y,w,h,cx,cy,left,right,top,bottom,chain,ci,rowTop,rowBottom,bandTop,bandBottom}

let y = HEADER_H + 28;
const bandRects = [];

for (const ph of PHASES) {
  const bandTop = y;
  // header row inside band
  let cy = bandTop + TITLE_H + 10;
  const chainBottoms = [];
  ph.chains.forEach((chain, ci) => {
    // measure
    const sizes = chain.map((n) => {
      const tL = wrap(n.t, 44).length; // approx title chars per line
      const dL = wrap(n.d, 92).length;
      return { h: VPAD * 2 + tL * TITLE_LH + dL * LINE_H, tL, dL };
    });
    const rowH = Math.max(...sizes.map((s) => s.h));
    const rowTop = cy;
    chain.forEach((n, i) => {
      const x = BAND_X + PAD + i * (BOX_W + GAP);
      const s = sizes[i];
      nodePos.set(n.id, {
        x, y: rowTop, w: BOX_W, h: s.h, cx: x + BOX_W / 2, cy: rowTop + rowH / 2,
        left: x, right: x + BOX_W, top: rowTop, bottom: rowTop + s.h,
        chain: ci, ci: i, rowH, rowTop, rowBottom: rowTop + rowH,
        bandTop, t: n.t, d: n.d, tL: s.tL, dL: s.dL,
      });
    });
    cy = rowTop + rowH + RGAP;
    chainBottoms.push(rowTop + rowH);
  });
  const bandBottom = cy - RGAP + PAD;
  bandRects.push({ top: bandTop, bottom: bandBottom, ph });
  y = bandBottom + BAND_GAP;
}
const H = y - BAND_GAP + 56;

// ---------------- svg ----------------
const S = [];
S.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">`);
S.push(`<defs>
<marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${INK}"/></marker>
</defs>`);
S.push(`<rect width="${W}" height="${H}" fill="${BG}"/>`);

// ---- poster header ----
const hx = BAND_X + PAD;
S.push(`<text x="${hx}" y="72" font-size="19" letter-spacing="6" font-weight="600" fill="${INK}">NEXTCALL · SYSTEM MAP · ONE PAGE</text>`);
S.push(`<text x="${hx}" y="150" font-size="58" font-weight="700" letter-spacing="-1" fill="${INK}">Every user activity, and how the app handles it</text>`);
S.push(`<text x="${hx}" y="192" font-size="21" fill="${INK}">From the first marketing-site scroll to the admin console — login, onboarding, billing, calls, texts, DMs, settings, integrations, support, crons and self-healing.</text>`);
// legend
const ly = 244;
S.push(`<line x1="${hx}" y1="${ly}" x2="${hx + 70}" y2="${ly}" stroke="${INK}" stroke-width="2" marker-end="url(#arr)"/>`);
S.push(`<text x="${hx + 84}" y="${ly + 6}" font-size="18" fill="${INK}">primary flow</text>`);
S.push(`<line x1="${hx + 240}" y1="${ly}" x2="${hx + 310}" y2="${ly}" stroke="${INK}" stroke-width="2" stroke-dasharray="7 6" marker-end="url(#arr)"/>`);
S.push(`<text x="${hx + 324}" y="${ly + 6}" font-size="18" fill="${INK}">cross-phase link</text>`);
S.push(`<rect x="${hx + 540}" y="${ly - 14}" width="52" height="28" fill="none" stroke="${INK}" stroke-width="1.6" rx="7"/>`);
S.push(`<text x="${hx + 604}" y="${ly + 6}" font-size="18" fill="${INK}">user action / system step</text>`);
S.push(`<line x1="${hx}" y1="${HEADER_H - 12}" x2="${W - BAND_X - PAD}" y2="${HEADER_H - 12}" stroke="${INK}" stroke-width="3"/>`);

// ---- bands ----
for (const { top, bottom, ph } of bandRects) {
  S.push(`<rect x="${BAND_X}" y="${top}" width="${BAND_W}" height="${bottom - top}" fill="none" stroke="${INK}" stroke-width="1.6" rx="18"/>`);
  S.push(`<text x="${BAND_X + PAD}" y="${top + 44}" font-size="30" font-weight="700" letter-spacing="2" fill="${INK}">${esc(ph.num)}</text>`);
  S.push(`<text x="${BAND_X + PAD + 66}" y="${top + 44}" font-size="24" font-weight="700" letter-spacing="3" fill="${INK}">${esc(ph.title)}</text>`);
  S.push(`<text x="${BAND_X + BAND_W - PAD}" y="${top + 43}" font-size="18" font-style="italic" text-anchor="end" fill="${INK}">${esc(ph.caption)}</text>`);
  S.push(`<line x1="${BAND_X + PAD}" y1="${top + TITLE_H - 4}" x2="${BAND_X + BAND_W - PAD}" y2="${top + TITLE_H - 4}" stroke="${INK}" stroke-width="1"/>`);
}

// ---- node boxes ----
for (const [, p] of nodePos) {
  S.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="${INK}" stroke-width="1.3" rx="10"/>`);
  const tLines = wrap(p.t, 44);
  tLines.forEach((ln, i) => {
    S.push(`<text x="${p.x + 15}" y="${p.y + VPAD + 18 + i * TITLE_LH}" font-size="19.5" font-weight="650" fill="${INK}">${esc(ln)}</text>`);
  });
  const dTop = p.y + VPAD + tLines.length * TITLE_LH + 4;
  wrap(p.d, 92).forEach((ln, i) => {
    S.push(`<text x="${p.x + 15}" y="${dTop + 14 + i * LINE_H}" font-size="14" fill="${INK}">${esc(ln)}</text>`);
  });
}

// ---- intra-phase edges ----
const edge = (pts, dashed) =>
  S.push(`<path d="${rpath(pts)}" fill="none" stroke="${INK}" stroke-width="1.8"${dashed ? ' stroke-dasharray="7 6"' : ""} marker-end="url(#arr)"/>`);

for (const ph of PHASES) {
  ph.chains.forEach((chain, ci) => {
    // horizontal arrows within a row
    chain.forEach((n, i) => {
      if (i === 0) return;
      const a = nodePos.get(n.id), b = nodePos.get(chain[i - 1].id);
      edge([[b.right + 2, a.cy], [a.left - 3, a.cy]], false);
    });
    // row transition: last of row ci-1 -> first of row ci
    if (ci > 0) {
      const a = nodePos.get(ph.chains[ci - 1][ph.chains[ci - 1].length - 1].id);
      const b = nodePos.get(chain[0].id);
      const midY = (a.rowBottom + b.rowTop) / 2;
      edge([[a.cx, a.bottom + 2], [a.cx, midY], [b.cx, midY], [b.cx, b.top - 3]], false);
    }
  });
  // branches
  for (const [from, to] of ph.branches) {
    const a = nodePos.get(from), b = nodePos.get(to);
    const midY = a.rowBottom === b.rowTop ? (a.rowBottom + b.rowTop) / 2 : Math.max(a.bottom + 18, Math.min(b.top - 18, (a.rowBottom + b.rowTop) / 2));
    edge([[a.cx, a.bottom + 2], [a.cx, midY], [b.cx, midY], [b.cx, b.top - 3]], true);
  }
}

// ---- cross-phase edges ----
const slotCount = { L: 0, R: 0 };
const gutterX = (side, slot) => (side === "L" ? BAND_X - 30 - slot * 14 : W - BAND_X + 30 + slot * 14);
for (const [from, to, label, side] of CROSS) {
  const a = nodePos.get(from), b = nodePos.get(to);
  const gx = gutterX(side, slotCount[side]++);
  const srcMid = (a.rowBottom + a.bandBottom) / 2 < a.bottom + 30 ? a.bottom + 16 : a.bottom + 16;
  const chanY = srcMid; // clear channel just below source row
  const tgtChanY = b.top - 12;
  const pts = [
    [a.cx, a.bottom + 2],
    [a.cx, chanY],
    [gx, chanY],
    [gx, tgtChanY],
    [b.cx, tgtChanY],
    [b.cx, b.top - 3],
  ];
  S.push(`<path d="${rpath(pts, 14)}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-dasharray="7 6" marker-end="url(#arr)"/>`);
  // label along gutter vertical
  const midY = (chanY + tgtChanY) / 2;
  S.push(`<text x="${gx + (side === "L" ? 5 : -5)}" y="${midY}" font-size="13" font-style="italic" fill="${INK}" text-anchor="middle" transform="rotate(${side === "L" ? -90 : 90} ${gx + (side === "L" ? 5 : -5)} ${midY})" paint-order="stroke" stroke="${BG}" stroke-width="5">${esc(label)}</text>`);
}

S.push(`</svg>`);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>nextCall — Complete User Activity Map</title>
<style>
@page { size: ${W}px ${H}px; margin: 0; }
html, body { margin: 0; padding: 0; background: ${BG}; }
svg { display: block; }
</style></head><body>${S.join("\n")}</body></html>`;

fs.writeFileSync(OUT, html, "utf8");
console.log(`poster written: ${OUT}`);
console.log(`canvas: ${W} x ${H}px  (${(W / 96).toFixed(1)}in x ${(H / 96).toFixed(1)}in)`);
console.log(`nodes: ${nodePos.size}, cross links: ${CROSS.length}`);
