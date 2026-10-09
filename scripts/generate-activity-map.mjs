#!/usr/bin/env node
/**
 * nextCall - "every user activity" master map generator.
 *
 * Emits, from ONE source of truth:
 *   docs/nextCall-user-activity-map.pdf   page 1 = the single master diagram
 *                                         (A0 landscape, 3370x2384pt) and
 *                                         pages 2..N = the same activities as a
 *                                         readable spec sheet (A3 landscape)
 *   docs/nextCall-user-activity-map.mmd   editable Mermaid source
 *
 * Zero dependencies: the PDF is written by hand (PDF 1.7, base-14 Courier so
 * nothing has to be embedded, vector shapes + orthogonal connectors).
 *
 * Run: node scripts/generate-activity-map.mjs
 */
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// 1. Activity model
//    kind: user  = the business owner does this
//          app   = our code handles it (route + what it writes)
//          ext   = a third-party provider round-trip
//          auto  = the system does it on the owner's behalf, unprompted
//          admin = internal nextCall staff only
//          data  = persisted state
// ---------------------------------------------------------------------------
const n = (id, k, t, d, opts = {}) => ({ id, k, t, d, ...opts });
const x = (from, to, label) => ({ from, to, label });

const KINDS = {
  user: { label: "Owner / visitor action", color: "#ea580c" },
  app: { label: "Our app handles it (route + writes)", color: "#4f46e5" },
  ext: { label: "Third-party provider round-trip", color: "#0d9488" },
  auto: { label: "Automated on your behalf", color: "#b45309" },
  admin: { label: "Internal nextCall staff", color: "#be123c" },
  data: { label: "Persisted state", color: "#475569" },
};

const PHASES = [
  {
    id: "P01",
    title: "1 - LANDING & SIGN-IN",
    sub: "public routes, no auth",
    accent: "#0284c7",
    nodes: [
      n("land_open", "user", "Open the marketing site /", "app/page.tsx client component: SceneStack of 11 scroll scenes (Hero, Features, HowItWorks, Integrations, Industries, Testimonials, Pricing, FAQ, Contact, FinalCta, Footer) with Lenis smooth scroll, ScrollProgress and Section3D depth.", { chain: true }),
      n("land_nav", "user", "Jump to a section (nav / anchors)", "Navigation + SmoothScroll: desktop anchor links scroll through Lenis; every scene wrapper id is unique so getElementById stays unambiguous.", { chain: true }),
      n("land_ref", "user", "Arrive through a referral link ?ref=CODE", "Read via URLSearchParams AFTER mount so SSR and the first client render match (avoids a hydration mismatch); the code is threaded into the pricing CTA and the Paddle checkout custom_data.", { link: "P3_ref" }),
      n("land_contact", "user", "Ask a question / request a feature", "POST /api/contact: honeypot field _hp, in-memory rate limit 3 per IP per minute, escaped HTML email through Resend to SUPPORT_EMAIL. POST /api/feature-request stores the idea."),
      n("land_legal", "user", "Read privacy / terms / pricing policy", "/privacy, /terms, /pricing-policy and /google-user-data are public on purpose: Paddle requires a pricing policy and Google requires a Limited Use disclosure page."),
      n("land_signup", "user", "Sign up or sign in", "Clerk modal from ClerkProvider in app/layout.tsx. The session cookie is what every protected route and API call is authorised by.", { chain: true }),
      n("land_mw", "app", "Edge gate: Clerk middleware", "proxy.ts (Next 16's renamed middleware). Public allowlist: /, /privacy, /terms, /pricing-policy, /google-user-data, /api/webhooks/*, /api/cron/*, /api/health, /api/reviews/*, /api/pusher/*, /api/contact. Everything else calls auth.protect().", { chain: true }),
      n("land_layout", "app", "Server guard on the dashboard shell", "app/dashboard/layout.tsx: auth() -> redirect('/') with no session, currentUser() for the display name, findBusinessByUserId() for the tenant, then isTrialExpired() and the minutes maths for the AI status pill.", { chain: true }),
      n("land_gate", "app", "DashboardAccessGate picks one of four states", "No business doc -> OnboardingFlow. Paddle success flag -> PaddleSuccessWaiting. Trial finished -> TrialEndedScreen. Has a doc but not active -> Paywall. status === 'active' -> the real dashboard."),
    ],
  },
  {
    id: "P02",
    title: "2 - ONBOARDING",
    sub: "one form, before any payment",
    accent: "#7c3aed",
    nodes: [
      n("onb_form", "user", "Fill the onboarding wizard", "OnboardingFlow: business name, owner name, phone, business type, industry, hours, services and free-form notes.", { chain: true }),
      n("onb_post", "app", "POST /api/business/onboard", "The Clerk user is read server-side for owner_email; the document is upserted keyed on business_id = Clerk userId, so re-submitting can never create a second tenant.", { chain: true }),
      n("onb_doc", "data", "businesses doc is created", "status 'pending', the six answers compiled into knowledge_base_text, a referral_code generated, counters zeroed, created_at stamped. This one document is the root every later feature keys off.", { chain: true }),
      n("onb_paywall", "app", "Gate immediately shows the Paywall", "No AI number, no calls and no integrations exist yet. Nothing is provisioned until money is collected, which is why trial and paid both flow through Paddle first."),
    ],
  },
  {
    id: "P03",
    title: "3 - BILLING & ACTIVATION",
    sub: "Paddle -> tenant goes live",
    accent: "#059669",
    nodes: [
      n("P3_choose", "user", "Choose a plan in the Paywall", "trial / standard / premium plus an optional referral code. Trial is 3 days and 50 minutes; standard is 200 min ($299); premium is 500 min ($399).", { chain: true }),
      n("P3_checkout", "app", "POST /api/checkout/paddle", "The plan name is mapped to a PADDLE_*_PRICE_ID environment variable on the SERVER, so a client cannot post a cheaper price id. custom_data carries clerk_user_id, plan, ref and business_name.", { chain: true }),
      n("P3_txn", "ext", "Paddle transaction + overlay checkout", "Paddle creates the transaction and the browser opens it as an overlay. Card data never touches our servers.", { chain: true }),
      n("P3_paid", "user", "Pay", "On success Paddle redirects back with ?paddle=success and a transaction id.", { chain: true }),
      n("P3_wait", "app", "PaddleSuccessWaiting polls activation", "GET /api/business/status?transaction_id -> verifyPaidTransaction() calls Paddle for that transaction and refuses to activate unless custom_data.clerk_user_id matches the session AND status === 'completed'.", { chain: true }),
      n("P3_active", "data", "Tenant becomes active", "status 'active', plan_type, minutes_limit (50/200/500), trial_started_at + trial_ends_at, paddle_customer_id and paddle_subscription_id stored.", { chain: true }),
      n("P3_hook", "ext", "POST /api/webhooks/paddle", "paddle-signature HMAC verified with a 5 minute replay window, then webhook_events gives idempotency. This path is the AUTHORITATIVE activation; the browser redirect is only a convenience.", { chain: true }),
      n("P3_branch", "auto", "Webhook event router", "Event router: subscription.created|activated -> full activation. subscription.updated -> reconcile the plan from the price id (limits reset only on a real change). canceled|expired -> status 'cancelled' + a 30 day deletion date. purpose 'additional_minutes' -> $inc minutes.", { chain: true }),
      n("P3_prov", "app", "provisionTwilioNumber()", "Reuse the subaccount by its deterministic friendly name (a retry must not bill a second one) or create it, then buy a US toll-free number UNDER it with voiceUrl /api/webhooks/twilio/inbound and smsUrl /api/webhooks/twilio/sms-inbound. A failed purchase closes a fresh subaccount.", { chain: true, link: "P10_sms" }),
      n("P3_store", "data", "Subaccount + number stored", "twilio_subaccount_sid, twilio_number and the twilio_numbers array. A failure writes the sentinel PROVISIONING_FAILED so later code (numbers/add, health checks) can self-heal.", { chain: true }),
      n("P3_ref", "auto", "Referral bonus is credited", "The referrer is credited +40 minutes (standard) or +70 (premium) through an atomic { referral_applied_at: { $exists: false } } claim, so two concurrent Paddle events cannot double-credit; self-referral is blocked. The founder gets a Telegram alert.", { link: "P6_code" }),
      n("P3_minutes", "user", "Buy extra minutes mid-cycle", "POST /api/checkout/paddle-minutes: 50 minute batches capped at 200 (standard) / 500 (premium), blocked on trial. The webhook credits them. Calls PAUSE at the limit - there is no overage billing.", { link: "P09_guard" }),
      n("P3_portal", "user", "Manage billing / cancel", "POST /api/billing/portal creates a Paddle customer portal session. Cancelling fires subscription.canceled -> 30 day grace, then the cleanup cron closes Twilio and deletes the tenant.", { chain: true }),
      n("P3_trial", "auto", "Trial runs out", "Nothing to click: isTrialExpired() rejects calls and texts at the edge on the first request past trial_ends_at, and the hourly cron flips status to 'trial_expired' and emails the owner.", { link: "P09_guard" }),
    ],
  },
  {
    id: "P04",
    title: "4 - DASHBOARD HOME",
    sub: "what you see every morning",
    accent: "#0891b2",
    nodes: [
      n("dash_open", "user", "Open /dashboard", "RSC reads the business doc and the latest 50 calls (withRetry so a flaky Astra call degrades to an empty list instead of a 500).", { chain: true }),
      n("dash_kpi", "user", "Read the KPI cards", "DashboardCards + AnimatedNumber: calls, minutes, appointments, hot leads - all derived from the calls array the RSC already loaded, so no extra queries.", { chain: true }),
      n("dash_charts", "user", "Read the charts", "DashboardCharts: 7 day call volume + sentiment donut. Premium swaps in PremiumAnalytics: revenue, average job value, quote tracking, with CinematicChartCard.", { link: "P6_settings" }),
      n("dash_calls_list", "user", "Scan the recent calls list", "Five most recent calls with sentiment / lead / appointment / emergency badges and a deep link into /dashboard/calls."),
      n("dash_numbers", "user", "Check your AI numbers", "Rendered from business.twilio_numbers, filtering out the PROVISIONING_FAILED sentinel, so the owner never sees a fake number."),
      n("dash_bell", "user", "Open the notification bell", "GET /api/notifications (50 latest + unread count), PATCH mark_read / mark_all_read, DELETE single. Types: hot_lead, emergency, appointment, missed_call, minutes_80|90|100, trial_expired.", { chain: true }),
      n("dash_minutes", "user", "Watch the minutes counter", "MinutesCounter shows used/limit from the business doc; at the limit it points at Settings -> Billing to buy a pack or upgrade.", { chain: true }),
      n("dash_status", "user", "Check the AI status pill", "AIStatusPill: active only when status === 'active' AND total_minutes_used < minutes_limit. This is the same condition the inbound call route enforces.", { link: "P09_guard" }),
      n("dash_setup", "user", "Work the setup checklist", "SetupProgressSidebar: 10 weighted items (profile, hours/services, knowledge, greeting, first call, SMS approved, calendar, review link, job value) each deep-linking to settings?focus=... and the widget hides itself at 100%.", { link: "P6_settings" }),
      n("dash_feed", "user", "Watch the live activity feed", "ActivityFeed subscribes to the Pusher channel private-business-{id}, event activity:new: incoming_call, ai_answered, understanding, appointment_confirmed, event_created, email_sent, sms_sent, hot_lead, emergency, minutes_80/90/100.", { link: "P11_pusher" }),
      n("dash_realtime", "app", "Realtime channel authorisation", "POST /api/pusher/auth only signs the channel private-business-{userId} for the signed-in user, so one tenant can never subscribe to another tenant's feed.", { link: "P11_pusher" }),
      n("dash_nav", "user", "Navigate to Calls / Settings / Docs", "NavLinks (desktop sidebar) and MobileNav, plus the footer links to /dashboard/docs, /dashboard/support and the in-app legal pages."),
    ],
  },
  {
    id: "P05",
    title: "5 - CALL LOGS & JOBS",
    sub: "the money screen",
    accent: "#ea580c",
    nodes: [
      n("calls_open", "user", "Open /dashboard/calls", "CallLogsTable renders the 50 most recent calls; CallRow is keyboard accessible and shows duration, source, sentiment, lead quality, appointment and emergency state.", { chain: true }),
      n("calls_read", "user", "Read a transcript / summary", "Everything the analyst model extracted is stored on the call: transcript, 1-sentence summary, sentiment, lead_quality, appointment_date_time, quote_given / quote_amount, recording_url.", { chain: true }),
      n("calls_flag", "user", "Flag or unflag a call", "POST /api/calls/toggle-flag - flips is_flagged so the owner can keep a shortlist of leads worth chasing.", { chain: true }),
      n("calls_done", "user", "Mark the job done", "POST /api/calls/mark-job { done }: sets job_status 'done' + job_done_at, appends to business.jobs_completed (last 20, used as AI context), then triggers the review request (email first, SMS fallback) and records review_status 'link_sent'. A second click returns 409 - never two review texts.", { chain: true, link: "P10_review" }),
      n("calls_noshow", "user", "Mark a no-show", "job_status 'no_show' - stops the 24h auto-completion cron from treating it as a completed job, so no review request goes out.", { chain: true }),
      n("calls_auto", "auto", "Nothing clicked: the cron closes the loop", "The hourly job-done-followup finds booked jobs 24h in the past that are still 'pending', marks them 'auto_done' and sends the review request - so revenue-generating work is never silently forgotten.", { link: "P11_cron" }),
    ],
  },
  {
    id: "P06",
    title: "6 - SETTINGS & KNOWLEDGE",
    sub: "the tabs that change AI behaviour",
    accent: "#4f46e5",
    nodes: [
      n("P6_settings", "user", "Open /dashboard/settings", "SettingsForm with ?focus=business|knowledge|greeting|routing|integrations|sms|billing - the same deep links the dashboard checklist uses.", { chain: true }),
      n("P6_save", "app", "POST /api/business/update-settings", "One write path for the whole profile, and it validates before storing: business_timezone must round-trip through Intl, review_link must be https, zapier_webhook_url must be public https (SSRF guard).", { chain: true }),
      n("P6_profile", "user", "Edit name, type, service area, owner phone", "Feeds the AI's answers and the owner-SMS target, plus the dashboard header and every outgoing email signature.", { chain: true }),
      n("P6_hours", "user", "Set hours, services, exclusions, pricing rules, FAQs", "Compiled into knowledge_base_text - the exact string Retell injects into the voice prompt and the SMS brain, so editing here is editing what the AI is allowed to say.", { chain: true, link: "P09_prompt" }),
      n("P6_greeting", "user", "Set greeting tone, greeting text and AI name", "Sent as retell_llm_dynamic_variables so the AI introduces itself the way the owner wants on every call.", { link: "P09_prompt" }),
      n("P6_routing", "user", "Toggle routing rules", "forward_emergency, notify_hot_lead, sms_missed_call, email_followup, daily_summary, appointment_reminders, review_followup. The server re-enforces plan gating on write (premium-only keys forced false for lower plans), never trusting the client.", { chain: true, link: "P09_fanout" }),
      n("P6_emergency", "user", "Define what counts as an emergency", "emergency_definition is injected into the agent prompt and drives the transfer_call tool + the emergency webhook fan-out.", { link: "P09_emerg" }),
      n("P6_review", "user", "Set the review link + average job value", "review_link is the destination of every review request; avg_job_value is premium-only and unlocks the revenue analytics cards.", { link: "P10_review" }),
      n("P6_zapier", "user", "Add a Zapier / automation webhook", "Premium only. Stored only after isSafeWebhookUrl() proves it is https and not localhost / RFC1918, blocking SSRF from our own servers.", { link: "P09_fanout" }),
      n("P6_numbers", "user", "Add or remove a phone number", "POST /api/numbers/add: premium only, max 3. Self-heals by provisioning first if the tenant never got a line, then buys another toll-free number UNDER the same subaccount with the webhooks already wired. POST /api/numbers/remove releases it.", { chain: true }),
      n("P6_code", "user", "Share your referral code", "POST /api/business/referral-code returns the code generated at onboarding so a second business landing on /?ref=CODE credits this account with +40 / +70 minutes.", { link: "P3_ref" }),
      n("P6_sms_tab", "user", "Open the SMS compliance tab", "GET /api/sms/compliance returns a 20+ field prefilled Toll-Free Verification form plus the current status (lazily refreshed from Twilio at most every 6h, so APPROVED shows up in-app without a cron).", { chain: true }),
      n("P6_sms_submit", "app", "POST /api/sms/compliance", "Validates every field (URLs, emails, E.164 phone, enumeration values) then submitTollfreeVerification() to Twilio; the sync/reconcile step already runs through the recovery engine, so a Twilio auth failure is retried with subaccount scope instead of surfacing as a dead form.", { chain: true, link: "P10_gate" }),
      n("P6_sms_state", "ext", "Twilio reviews the verification", "pending -> approved | rejected, with rejection reasons and the edit window mirrored back into sms_compliance. This single flag is what unlocks ALL outbound texting (reminders, review asks, missed-call follow-ups).", { chain: true }),
    ],
  },
  {
    id: "P07",
    title: "7 - INTEGRATIONS (OAUTH)",
    sub: "connect the tools you already use",
    accent: "#0d9488",
    nodes: [
      n("P7_google", "user", "Click Connect Google", "GET /api/integrations/google-calendar/auth: CSRF state in an httpOnly cookie, access_type=offline + prompt=consent to force a refresh token, scopes calendar.events + business.manage + userinfo.email.", { chain: true }),
      n("P7_google_cb", "ext", "Google consent -> callback", "State cookie is compared and deleted, the code is exchanged, the refresh token and the account email (decoded from the id token) are stored, google_business_connected is set, and the user is redirected with ?connected=1.", { chain: true }),
      n("P7_google_use", "data", "What the token unlocks", "Appointment -> Calendar events (all plans) and the hourly Google Reviews sync + AI review replies (paid plans). Token problems are healed by the recovery action GOOGLE_REFRESH_OAUTH_TOKEN.", { chain: true, link: "P09_calendar" }),
      n("P7_meta", "user", "Click Connect Facebook / Instagram", "GET /api/integrations/meta/auth: CSRF state cookie plus scopes pages_show_list, pages_messaging, instagram_manage_messages, pages_read_engagement, business_management.", { chain: true }),
      n("P7_meta_cb", "ext", "FB dialog -> callback", "Short-lived token -> long-lived token, /me/accounts, with a business-portfolio owned_pages fallback, then the primary page token, its Instagram business account and the page picture are stored.", { chain: true }),
      n("P7_meta_use", "data", "What the page token unlocks", "Meta DM auto-replies for premium tenants (Messenger + Instagram) and the sender identity shown in the settings UI.", { chain: true, link: "P10_meta" }),
      n("P7_disconnect", "user", "Disconnect an integration", "POST /api/integrations/google-calendar/disconnect and /api/integrations/meta/disconnect clear the stored tokens, which instantly stops calendar writes / DM replies and shows the card as disconnected."),
    ],
  },
  {
    id: "P08",
    title: "8 - SUPPORT CHAT",
    sub: "you <-> nextCall staff",
    accent: "#0284c7",
    nodes: [
      n("sup_open", "user", "Open the chat widget", "ChatWidget is rendered for premium tenants in the dashboard layout; history comes from GET /api/chat/history and POST /api/chat/read clears the unread badge.", { chain: true }),
      n("sup_send", "app", "Send a message or a photo", "POST /api/chat/send: 2000 char cap, 2MB photo cap, photos persisted to chat_photos, message id generated server-side so ordering survives retries.", { chain: true }),
      n("sup_telegram", "ext", "Staff is pinged on Telegram", "notifyAdminChat() sends an escaped message and returns the Telegram message_id, which is stored ON the message - that is the join key the reply webhook uses later.", { chain: true }),
      n("sup_store", "data", "Support thread upserted + pushed live", "conversations { kind: 'support' } gets the message appended with $push, read_by_admin_at reset to null, and notifyChatAdmins() fires chat:new on private-admin-chat so /admin/chat animates instantly.", { chain: true }),
      n("sup_admin_reply", "admin", "Staff replies in /admin/chat", "POST /api/admin/chat/reply appends an owner-role message and just calls notifyChat() - the widget receives it in real time with no polling.", { chain: true }),
      n("sup_tg_reply", "admin", "Staff replies inside Telegram instead", "POST /api/webhooks/telegram: x-telegram-bot-api-secret-token must match, sender id must equal TELEGRAM_CHAT_ID, and the Telegram reply_to_message_id is resolved back to the conversation (direct lookup, then a bounded scan fallback) before the reply is appended and pushed to the widget."),
    ],
  },
  {
    id: "P09",
    title: "9 - AI ANSWERS THE PHONE",
    sub: "the core product, customer-triggered",
    accent: "#be123c",
    nodes: [
      n("P09_voice", "ext", "Customer calls your AI number", "Twilio hits POST /api/webhooks/twilio/inbound; verifyTwilioRequest() validates the X-Twilio-Signature so nobody can spoof a call into your minutes.", { chain: true }),
      n("P09_guard", "app", "Four guards before any AI runs", "RETELL_AGENT_ID missing -> loud Telegram alert instead of a silent outage. Business not found by number -> polite TwiML. isTrialExpired() -> in-app notification and an unavailable message. total_minutes_used >= minutes_limit -> missed-lead notification and an unavailable message. This is what enforces the no-overage promise.", { chain: true }),
      n("P09_register", "app", "registerPhoneCall + tenant prompt", "Retell is registered with the business_id metadata and dynamic variables: knowledge_base, greeting, greeting_tone, routing_rules, emergency_definition, owner_phone, customer_phone. Multi-tenant isolation is per-call, not per-deployment.", { chain: true, link: "P6_hours" }),
      n("P09_prompt", "data", "Voice prompt is assembled", "Everything set in Settings (knowledge base, greeting, tone, emergency definition, routing rules) plus the live business name / service area is bound into this single call - no shared mutable prompt anywhere.", { chain: true }),
      n("P09_sip", "ext", "TwiML dials Retell over SIP", "The route answers with Dial / Sip sip:{call_id}@sip.retellai.com. Retell cannot natively forward under this model, which is exactly why the emergency path below rewrites live TwiML instead.", { chain: true }),
      n("P09_emerg", "ext", "Emergency: the agent calls transfer_call", "POST /api/webhooks/retell/emergency (HMAC verified): an urgent SMS heads-up to the owner, a live dashboard toast, then the LIVE call's TwiML is rewritten to Dial the owner using the subaccount-scoped client (master creds get Twilio 20404). If the bridge fails, the founder is paged.", { chain: true, link: "P11_telegram" }),
      n("P09_end", "ext", "Customer hangs up", "POST /api/webhooks/retell/call-ended: signature + a webhook_events in-flight window, then a call_id dedupe check, so a Retell retry can never double-count minutes or double-book a calendar event.", { chain: true }),
      n("P09_analyse", "app", "One model call turns talk into data", "gpt-4o-mini in JSON mode returns summary, sentiment, lead_quality, appointment_booked, customer email + name, is_emergency, appointment date/time, duration, quote_given and quote_amount. A model failure drops to safe defaults instead of losing the call.", { chain: true }),
      n("P09_record", "data", "Call row written + minutes debited", "$inc total_minutes_used and total_calls_processed atomically (race-safe), while the full call document - transcript, analysis, job_status 'pending' - is stored for the dashboard.", { chain: true }),
      n("P09_fanout", "auto", "Post-call automations fire in parallel", "Calendar event (with the timezone-corrected start time), Zapier webhook (premium), follow-up email to the customer, hot-lead alert, emergency alert, appointment notification, missed-call SMS under 10s, and 80/90/100% minute alerts. Each is independently try/caught so one provider outage cannot lose the others.", { chain: true }),
      n("P09_calendar", "ext", "Google Calendar event created", "zonedTimeToUtc() converts the model's naive local time via business_timezone (naive parsing shifted US appointments 4-5h), midnight becomes 10:00 local, past dates roll forward, and the insert runs through executeWithRecovery so a 401/403 refreshes the token and retries once."),
    ],
  },
  {
    id: "P10",
    title: "10 - AI ANSWERS TEXT & DMs",
    sub: "SMS, WhatsApp, Messenger, Instagram",
    accent: "#b45309",
    nodes: [
      n("P10_sms", "ext", "Customer texts your number", "POST /api/webhooks/twilio/sms-inbound (signature verified). The same handler serves WhatsApp: the whatsapp: prefix is detected, stripped and re-applied on the way out, and the channel is recorded per message.", { chain: true }),
      n("P10_optout", "app", "TCPA opt-out runs FIRST", "classifyOptOutKeyword() is evaluated before the trial and throttle gates: STOP-family keywords are confirmed and the number is recorded in sms_optouts, START-family clears it. A customer must always be able to opt out, whatever state the account is in.", { chain: true }),
      n("P10_throttle", "app", "Trial + abuse gates", "An expired trial gets one polite 'number is no longer active' reply. Otherwise a 25 messages-per-hour per-customer cap stops a runaway loop from burning AI credits.", { chain: true }),
      n("P10_brain", "app", "SMS brain with real tools", "gpt-4o-mini reads knowledge_base_text plus the thread history and can actually call book_appointment, confirm_appointment, reschedule_appointment and cancel_appointment - which write straight to the calls collection, so '1 / 2 / 3' reminder replies really do move the appointment.", { chain: true }),
      n("P10_reply", "app", "Reply goes through one choke point", "sendSmsReply() -> sendBusinessSms(), which enforces three things at once: TFV approved, not opted out, and the business's OWN subaccount as the sending scope (master-scope sends fail with Twilio 21660).", { chain: true, link: "P6_sms_state" }),
      n("P10_gate", "data", "Outbound texting is gated", "Until Toll-Free Verification is approved, sends are logged and skipped rather than failed noisily - which is why the compliance tab is step 8 of the setup checklist.", { chain: true }),
      n("P10_meta", "ext", "Customer DMs your Facebook / Instagram", "POST /api/webhooks/meta/inbound: x-hub-signature-256 verified, webhook_events idempotency per sender + timestamp, business matched on meta_page_id, premium only.", { chain: true, link: "P7_meta_use" }),
      n("P10_buffer", "app", "3 second human buffer", "The handler waits 3s and re-reads the conversation: if a newer message arrived it aborts, so a customer typing three lines gets ONE answer instead of three - and messages are appended with $push so nothing is overwritten.", { chain: true }),
      n("P10_meta_brain", "app", "JSON brain + hard safety overrides", "One call returns intent, sentiment, confidence, leadStage, extracted name/phone, action and reply. Then deterministic overrides apply: confidence under 0.7 or angry/frustrated/urgent escalates, and an emergency intent always escalates - the model never gets the last word.", { chain: true }),
      n("P10_meta_send", "ext", "Reply is sent through the Graph API", "The reply and the new conversation state are persisted, then posted to the page's send endpoint with the stored page token.", { chain: true }),
      n("P10_review", "auto", "Review request after the work is done", "sendReviewRequest(): email first if the caller gave an address, SMS fallback - and the SMS path is TFV-gated like everything else. Only ever sent when a review link or a Google profile is configured."),
      n("P10_remind", "auto", "Appointment reminder with 1 / 2 / 3", "The hourly cron emails (then texts) the customer in the business's own timezone and marks reminder_sent so it never repeats; the replies are handled by the booking tools above."),
    ],
  },
  {
    id: "P11",
    title: "11 - AUTOMATION & REALTIME",
    sub: "what happens while you are not looking",
    accent: "#6d28d9",
    nodes: [
      n("P11_cron", "auto", "Hourly jobs (GitHub Actions)", "curl -H 'Authorization: Bearer CRON_SECRET' at appointment-reminders, job-done-followup, sync-reviews and expire-trials. Every cron route compares the secret with a timing-safe equal.", { chain: true }),
      n("P11_daily", "auto", "Daily + weekly jobs", "cleanup-cancelled at 00:00 (closes the Twilio subaccount FIRST and skips the delete if that fails, so a billed line can never be orphaned), daily-summary at 03:00 and weekly-summary on Monday mornings.", { chain: true }),
      n("P11_reviews", "ext", "Google Reviews sync + AI replies", "For every connected paid business: accounts -> locations -> v4 reviews, then unreplied ones get a short SEO-aware reply generated by gpt-4o-mini and PUT back to Google. The same logic is exposed to n8n at POST /api/reviews/generate-reply behind an x-api-key check.", { chain: true }),
      n("P11_email", "ext", "Resend emails", "Daily/weekly summaries, trial expiry notice, minute-limit notice, customer follow-ups, appointment reminders and review requests. Every send is wrapped so email trouble never breaks a business flow.", { chain: true }),
      n("P11_pusher", "ext", "Pusher realtime", "Channels private-business-{id} (activity:new, chat:new) and private-admin-chat (chat:new). notifyActivity() / notifyChat() never throw: a Pusher outage degrades to no toasts, never a failed call.", { chain: true }),
      n("P11_telegram", "ext", "Telegram as the ops bridge", "Two jobs in one bot: the owner-support bridge (phase 8) and the system alarm channel - provisioning failures, a missing RETELL_AGENT_ID, an emergency transfer that could not be bridged, and every HIGH/CRITICAL recovery incident.", { chain: true }),
      n("P11_n8n", "ext", "n8n boss alerts", "Hot-lead and emergency events are POSTed to N8N_BOSS_ALERT_URL so the owner can fan them out to any other channel they run.", { chain: true }),
      n("P11_idem", "data", "Idempotency, retries and caps", "webhook_events is the dedupe ledger for Retell, Twilio, Paddle, Meta and Telegram; the contact form is rate limited (3/IP/min); per-customer SMS is capped; and withRetry wraps Astra reads so a flaky database degrades instead of crashing a page."),
    ],
  },
  {
    id: "P12",
    title: "12 - ADMIN, SECURITY & SELF-HEALING",
    sub: "cross-cutting, always on",
    accent: "#475569",
    nodes: [
      n("adm_login", "admin", "Open /admin", "app/admin/layout.tsx allows only privateMetadata.role === 'admin' or an ADMIN_EMAILS match (both backend-set signals) and redirects everyone else to /dashboard. publicMetadata is never a trust anchor because it is client-readable.", { chain: true }),
      n("adm_kpi", "admin", "Admin overview", "AdminDashboardClient: tenants, usage, minutes and margin per plan using lib/costing, plus the incident counters.", { chain: true }),
      n("adm_chat", "admin", "Support inbox", "GET /api/admin/chat/list and /messages render the support threads; the admin layout shows an unread badge from a countDocuments() on read_by_admin_at: null.", { chain: true, link: "sup_open" }),
      n("adm_inc", "admin", "Incident console", "GET /api/admin/incidents with filters (free text, provider, severity, status, operation, date range) and a detail page per incident.", { chain: true }),
      n("adm_act", "admin", "Act on an incident", "POST /api/admin/incidents/[id] with retry / resolve / recover / dismiss / requires_action. Retry runs only a REGISTERED operation executor, refuses terminal statuses, and guards against two admins retrying the same incident with an inflight set.", { chain: true }),
      n("rec_engine", "app", "Recovery engine wraps provider calls", "executeWithRecovery(): normalize + redact, deterministic classification (Twilio codes, Google reasons, HTTP semantics - no AI involved), bounded retry, then a registry + policy-checked action. Maximum automatic recovery depth is 1.", { chain: true }),
      n("rec_ai", "app", "AI is a consultant, never an actor", "Only unknown or ambiguous errors reach gpt-4o-mini, only within a budget (ai-guard) and a fingerprint cache, and the answer must be an id from the backend registry - which is then re-checked by the same policy engine. When nothing is provably safe it fails CLOSED into an incident.", { chain: true }),
      n("rec_inc", "data", "Incident + audit trail", "Incidents aggregate by sha256 fingerprint with occurrence counts, a timeline, and every policy evaluation (checks[] with pass/fail reasons) kept as evidence for the admin console.", { chain: true, link: "P11_telegram" }),
      n("sec_sig", "app", "Every inbound edge verifies its sender", "Twilio signature, Retell HMAC with a 5 minute replay window, Paddle HMAC, Meta x-hub-signature-256 and the Telegram secret token - all compared with a timing-safe equal, and all fail closed.", { chain: true }),
      n("sec_abuse", "app", "SSRF, spam and prompt-safety guards", "isSafeWebhookUrl() blocks private hosts on user-supplied webhook URLs, the contact form is honeypot + rate limited, and every AI layer (SMS, Meta, voice) has deterministic overrides above the model."),
      n("ops_health", "app", "Operational surfaces", "GET /api/health for uptime monitors, structured [recovery] JSON logs, and a once-per-process production warning if the recovery guards ever fall back to in-memory state because Astra credentials are missing."),
    ],
  },
];

// ---------------------------------------------------------------------------
// 2. Geometry + text metrics
//    The PDF uses base-14 Courier, so every glyph is exactly 0.6em wide and
//    text measurement is exact arithmetic - no font embedding, no measuring.
// ---------------------------------------------------------------------------
const CW = 0.6; // Courier advance width in em
const hex = (h) => {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16) / 255, parseInt(s.slice(2, 4), 16) / 255, parseInt(s.slice(4, 6), 16) / 255];
};
const fmt = (v) => String(Math.round(v * 100) / 100);
const esc = (s) => String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

/** Greedy word wrap with exact Courier metrics + ".." on overflow. */
function wrap(str, size, maxW, maxLines) {
  const max = Math.max(6, Math.floor(maxW / (CW * size)));
  const out = [];
  let cur = "";
  for (let word of String(str).split(/\s+/)) {
    while (word.length > max) {
      if (cur) { out.push(cur); cur = ""; }
      out.push(word.slice(0, max));
      word = word.slice(max);
    }
    const cand = cur ? `${cur} ${word}` : word;
    if (cand.length <= max) cur = cand;
    else { if (cur) out.push(cur); cur = word; }
  }
  if (cur) out.push(cur);
  if (out.length <= maxLines) return out;
  const kept = out.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(2, max - 2))}..`;
  return kept;
}

const FONT = { reg: "F1", bold: "F2", italic: "F3" }; // Courier, Courier-Bold, Courier-Oblique

// ---------------------------------------------------------------------------
// 3. Layout
// ---------------------------------------------------------------------------
const MASTER = { w: 3370, h: 2384 };    // A0 landscape
const SPEC = { w: 1191.76, h: 841.89 }; // A3 landscape
const M = 26;
const COL_GAP = 44;
const BAND_PAD = 7;
const TAB_W = 3.4;
const BOX_PAD_X = 7;
const BOX_PAD_Y = 7;
const TITLE_FS = 10.2, TITLE_LEAD = 12.6;
const DETAIL_FS = [8.6, 8.2, 7.8, 7.4, 7.0, 6.6];
const DETAIL_LEAD = 1.24;
const MAX_TITLE_LINES = 2;
const MAX_DETAIL_LINES = 7;

const PHASE_HEAD_H = 52;
const TITLE_BLOCK_H = 92;
const LEGEND_H = 128;
const LANE_TOP = 12;    // vertical pitch of the feedback lanes
const LANE_BOTTOM = 10.5; // vertical pitch of the forward lanes

/** Count distinct (from column -> to column) links before layout runs. */
function linkCounts(phases) {
  const colOf = new Map();
  phases.forEach((p, i) => p.nodes.forEach((node) => colOf.set(node.id, i)));
  const fwd = new Set(), back = new Set();
  for (const p of phases) {
    for (const node of p.nodes) {
      if (!node.link || !colOf.has(node.link)) continue;
      const a = colOf.get(node.id), b = colOf.get(node.link);
      if (a === b) continue;
      (b > a ? fwd : back).add(`${a}>${b}`);
    }
  }
  return { fwd: fwd.size, back: back.size };
}

/** Wrap every node once and pick the largest detail font that fits the cap. */
function measure(phases, colW, scale = 1) {
  const innerW = colW - 2 * BAND_PAD - TAB_W - 2 * BOX_PAD_X;
  const titleFs = TITLE_FS * scale;
  const titleLead = TITLE_LEAD * scale;
  const ladder = DETAIL_FS.map((f) => f * scale);
  for (const p of phases) {
    for (const node of p.nodes) {
      node._title = wrap(node.t, titleFs, innerW, MAX_TITLE_LINES);
      let chosen = { fs: ladder[ladder.length - 1], lines: [] };
      for (const fs of ladder) {
        const lines = wrap(node.d, fs, innerW, MAX_DETAIL_LINES);
        chosen = { fs, lines };
        if (!lines[lines.length - 1].endsWith("..")) break;
      }
      node._d = chosen.lines;
      node._dfs = chosen.fs;
      node._h = 2 * BOX_PAD_Y + node._title.length * titleLead + 3 + node._d.length * chosen.fs * DETAIL_LEAD;
      node._innerW = innerW;
      node._tfs = titleFs;
      node._tlead = titleLead;
    }
  }
}

// Global fit ladder: if the wrapped content is taller than the page allows, the
// whole type scale steps down until it fits (never silently overlaps).
const FIT_SCALES = [1, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88, 0.86, 0.84, 0.82, 0.8, 0.78, 0.76, 0.74, 0.72];

function layout(phases, page) {
  const nCol = phases.length;
  const colW = (page.w - 2 * M - (nCol - 1) * COL_GAP) / nCol;

  const counts = linkCounts(phases);
  const topBusNeed = 14 + counts.back * LANE_TOP;
  const bottomBusNeed = 20 + counts.fwd * LANE_BOTTOM;

  const rows = Math.max(...phases.map((p) => p.nodes.length));
  const minCorridor = 16;
  const top = M + TITLE_BLOCK_H + PHASE_HEAD_H + topBusNeed;
  const rowsAvail = page.h - top - (bottomBusNeed + LEGEND_H + M);

  // step the type scale down until the wrapped content fits the rows area
  let scale = FIT_SCALES[FIT_SCALES.length - 1];
  let rowH = [];
  for (const s of FIT_SCALES) {
    measure(phases, colW, s);
    rowH = [];
    for (let r = 0; r < rows; r++) {
      rowH.push(Math.max(44, ...phases.map((p) => (p.nodes[r] ? p.nodes[r]._h : 0))));
    }
    const sum = rowH.reduce((a, b) => a + b, 0);
    if (sum + minCorridor * (rows - 1) <= rowsAvail) { scale = s; break; }
  }

  const sumH = rowH.reduce((a, b) => a + b, 0);
  const corridor = Math.max(minCorridor, Math.min(26, (rowsAvail - sumH) / Math.max(1, rows - 1)));

  const rowY = [];
  let y = top;
  for (let r = 0; r < rows; r++) { rowY.push(y); y += rowH[r] + corridor; }
  const rowsBottom = rowY[rows - 1] + rowH[rows - 1];

  phases.forEach((p, i) => {
    p._x = M + i * (colW + COL_GAP);
    p._w = colW;
    p._cx = p._x + colW / 2;
    p.nodes.forEach((node, r) => {
      node._x = p._x + BAND_PAD;
      node._w = colW - 2 * BAND_PAD;
      node._y = rowY[r] + (rowH[r] - node._h) / 2; // centre shorter boxes in their row
      node._cy = node._y + node._h / 2;
      node._col = i;
      node._idx = r;
    });
  });

  return {
    colW, rows, rowH, rowY, rowsBottom, corridor, scale, sumH,
    topBusY: top - topBusNeed + 20,
    bottomBusY: rowsBottom + 22,
  };
}

// ---------------------------------------------------------------------------
// 4. PDF drawing primitives (top-left origin, flipped on emit)
// ---------------------------------------------------------------------------
class Pen {
  constructor(w, h, palette) {
    this.w = w;
    this.h = h;
    this.p = palette;
    this.ops = [];
    this.overflows = [];
  }
  raw(op) { this.ops.push(op); return this; }
  rgb(c) { return `${fmt(c[0])} ${fmt(c[1])} ${fmt(c[2])}`; }
  py(y) { return this.h - y; }

  rect(x, y, w, h, { fill, stroke, lw = 1, r = 0, dash } = {}) {
    const y0 = this.py(y), y1 = y0 - h;
    if (r > 0) {
      this.raw(`${fmt(x + r)} ${fmt(y1)} m`);
      this.raw(`${fmt(x + w - r)} ${fmt(y1)} l`);
      this.raw(`${fmt(x + w)} ${fmt(y1)} ${fmt(x + w)} ${fmt(y1)} ${fmt(x + w)} ${fmt(y1 + r)} c`);
      this.raw(`${fmt(x + w)} ${fmt(y0 - r)} l`);
      this.raw(`${fmt(x + w)} ${fmt(y0)} ${fmt(x + w)} ${fmt(y0)} ${fmt(x + w - r)} ${fmt(y0)} c`);
      this.raw(`${fmt(x + r)} ${fmt(y0)} l`);
      this.raw(`${fmt(x)} ${fmt(y0)} ${fmt(x)} ${fmt(y0)} ${fmt(x)} ${fmt(y0 - r)} c`);
      this.raw(`${fmt(x)} ${fmt(y1 + r)} l`);
      this.raw(`${fmt(x)} ${fmt(y1)} ${fmt(x)} ${fmt(y1)} ${fmt(x + r)} ${fmt(y1)} c h`);
    } else {
      this.raw(`${fmt(x)} ${fmt(y1)} ${fmt(w)} ${fmt(h)} re`);
    }
    if (fill) this.raw(`${this.rgb(fill)} rg f`);
    if (stroke) this.raw(`q ${fmt(lw)} w ${this.rgb(stroke)} RG ${dash ? `[${dash}] 0 d ` : ""}S Q`);
    return this;
  }

  poly(points, { stroke, lw = 1, dash, fill, close } = {}) {
    if (!points.length) return this;
    this.raw(`${fmt(points[0][0])} ${fmt(this.py(points[0][1]))} m`);
    for (const [px, py] of points.slice(1)) this.raw(`${fmt(px)} ${fmt(this.py(py))} l`);
    if (close) this.raw("h");
    if (fill) this.raw(`${this.rgb(fill)} rg f`);
    if (stroke) this.raw(`q ${fmt(lw)} w ${this.rgb(stroke)} RG ${dash ? `[${dash}] 0 d ` : ""}S Q`);
    return this;
  }

  /** Filled triangular arrow head. angle in degrees, 0 = pointing right. */
  head(x, y, angle, size, color) {
    const a = (angle * Math.PI) / 180;
    const bx = x - size * Math.cos(a), by = y - size * Math.sin(a);
    const ox = Math.cos(a + Math.PI / 2) * size * 0.42;
    const oy = Math.sin(a + Math.PI / 2) * size * 0.42;
    return this.poly([[x, y], [bx + ox, by + oy], [bx - ox, by - oy]], { fill: color, close: true });
  }

  line(x1, y1, x2, y2, opts) { return this.poly([[x1, y1], [x2, y2]], opts); }

  text(x, yTop, str, { font = FONT.reg, size = 8, color, align = "left", maxChars } = {}) {
    let s = String(str);
    if (maxChars && s.length > maxChars) s = `${s.slice(0, Math.max(2, maxChars - 2))}..`;
    const width = s.length * CW * size;
    const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    const baseline = this.py(yTop + size * 0.78);
    if (left < -0.5 || left + width > this.w + 0.5 || yTop < -0.5 || yTop > this.h) {
      this.overflows.push(`${JSON.stringify(s.slice(0, 34))} x=${fmt(left)} y=${fmt(yTop)} w=${fmt(width)}`);
    }
    this.raw(`BT q ${this.rgb(color || this.p.ink)} rg /${font} ${fmt(size)} Tf 1 0 0 1 ${fmt(left)} ${fmt(baseline)} Tm (${esc(s)}) Tj Q ET`);
    return this;
  }
}

// ---------------------------------------------------------------------------
// 5. Palette, link consolidation and the master diagram page
// ---------------------------------------------------------------------------
const LIGHT = {
  page: [1, 1, 1],
  band: hex("#f7f9fc"),
  bandLine: hex("#e3e8f0"),
  box: [1, 1, 1],
  ink: hex("#0f172a"),
  dim: hex("#59657a"),
  faint: hex("#98a5b8"),
  chain: hex("#8fa0b6"),
  bus: hex("#6b7a92"),
  headerInk: [1, 1, 1],
  legend: hex("#f9fafc"),
  legendLine: hex("#dde3ec"),
};

/** Human labels for the consolidated cross-phase connectors, keyed "fromCol>toCol". */
const LINK_LABELS = {
  "0>2": "referral code rides into checkout",
  "2>5": "who referred whom",
  "2>8": "number, minutes and trial state the call route enforces",
  "2>9": "the provisioned number is what customers text",
  "3>5": "setup checklist + analytics deep links",
  "3>8": "same active / limit condition the call route re-checks",
  "3>10": "your live activity feed and chat widget",
  "4>9": "marking a job done is what fires the review request",
  "4>10": "the cron finishes jobs you never marked",
  "5>8": "knowledge base, greeting, routing rules, emergency def, zapier",
  "5>9": "review link + TFV approval gate every outbound text",
  "6>8": "the OAuth refresh token is what creates calendar events",
  "6>9": "the stored page token is what sends Messenger / IG replies",
  "8>10": "a failed emergency transfer pages the founder",
  "5>2": "a shared referral code credits minutes back here",
  "8>5": "every answer the agent gives comes from your knowledge base",
  "9>5": "TFV status is read back into the settings tab",
  "9>6": "DMs need the page token from integrations",
  "11>7": "a staff reply lands in your chat widget",
  "11>10": "HIGH / CRITICAL incidents alert on Telegram",
};

/** Merge the per-node links into ONE connector per (from column -> to column). */
function buildLinks(phases, index) {
  const merged = new Map();
  for (const p of phases) {
    for (const node of p.nodes) {
      if (!node.link) continue;
      const target = index.get(node.link);
      if (!target) { node._badLink = node.link; continue; }
      if (target._col === node._col) continue;
      const key = `${node._col}>${target._col}`;
      if (!merged.has(key)) {
        merged.set(key, { to: target, key, forward: target._col > node._col, sources: [] });
      }
      merged.get(key).sources.push(node);
    }
  }
  const list = [...merged.values()];
  for (const l of list) {
    l.from = l.sources.reduce((a, b) => (a._y <= b._y ? a : b)); // topmost source box
    l.label = LINK_LABELS[l.key] || `${l.from.t} feeds ${l.to.t}`;
  }
  const fwd = list.filter((l) => l.forward).sort((a, b) => a.from._col - b.from._col);
  const back = list.filter((l) => !l.forward).sort((a, b) => a.from._col - b.from._col);
  fwd.forEach((l, i) => { l.lane = i; });
  back.forEach((l, i) => { l.lane = i; });
  return { fwd, back, all: list };
}

function drawMaster(phases, theme, meta) {
  const pen = new Pen(MASTER.w, MASTER.h, theme);
  const L = layout(phases, MASTER);
  const index = new Map();
  for (const p of phases) for (const node of p.nodes) index.set(node.id, node);
  const links = buildLinks(phases, index);

  pen.rect(0, 0, MASTER.w, MASTER.h, { fill: theme.page });

  // ---- title block ----
  pen.text(M, M - 4, "nextCall", { font: FONT.bold, size: 22, color: theme.ink });
  pen.text(M + 190, M + 6, "AI RECEPTIONIST SAAS", { font: FONT.bold, size: 11, color: hex("#ea580c") });
  pen.text(M, M + 30, "COMPLETE USER ACTIVITY MAP - every action a person can take and exactly what the code does about it", { font: FONT.bold, size: 11.5, color: theme.ink, maxChars: 120 });
  pen.text(M, M + 48, "Each box is one real activity: who does it, the route or module that handles it, and the provider or collection it touches.", { size: 9.4, color: theme.dim });
  pen.text(M, M + 63, `${phases.length} phases  |  ${phases.reduce((a, p) => a + p.nodes.length, 0)} mapped activities  |  ${links.all.length} cross-phase dependencies  |  generated ${meta.date}  |  source: scripts/generate-activity-map.mjs`, { size: 8.4, color: theme.faint, maxChars: 150 });
  pen.text(MASTER.w - M, M + 6, "PAGE 1 - THE WHOLE MAP (A0 landscape)", { font: FONT.bold, size: 10.5, color: theme.ink, align: "right" });
  pen.text(MASTER.w - M, M + 22, "Pages 2+ repeat every activity as readable text", { size: 8.4, color: theme.faint, align: "right" });
  pen.text(MASTER.w - M, M + 37, "Solid arrows = order inside a phase", { size: 8.4, color: theme.faint, align: "right" });
  pen.text(MASTER.w - M, M + 52, "Dashed arrows = dependency between phases (see the labels)", { size: 8.4, color: theme.faint, align: "right" });
  pen.line(M, M + 74, MASTER.w - M, M + 74, { stroke: theme.bandLine, lw: 1.2 });

  // ---- phase bands + headers ----
  for (const p of phases) {
    const last = p.nodes[p.nodes.length - 1];
    const bandTop = M + TITLE_BLOCK_H + PHASE_HEAD_H + 8;
    const bandBottom = last._y + last._h + 8;
    pen.rect(p._x, bandTop, p._w, bandBottom - bandTop, { fill: theme.band, stroke: theme.bandLine, lw: 1, r: 8 });
    pen.rect(p._x, M + TITLE_BLOCK_H, p._w, PHASE_HEAD_H, { fill: hex(p.accent), r: 8 });
    const titleLines = wrap(p.title, 10, p._w - 16, 2);
    let hy = M + TITLE_BLOCK_H + (titleLines.length > 1 ? 7 : 12);
    for (const line of titleLines) {
      pen.text(p._cx, hy, line, { font: FONT.bold, size: 10, color: theme.headerInk, align: "center" });
      hy += 12;
    }
    pen.text(p._cx, hy + 1, `${p.sub} - ${p.nodes.length} steps`, {
      size: 7.4, color: hex("#eef4ff"), align: "center", maxChars: Math.floor((p._w - 8) / (0.6 * 7.4)),
    });
  }

  // ---- activity boxes ----
  for (const p of phases) {
    for (const node of p.nodes) {
      const kc = hex(KINDS[node.k].color);
      pen.rect(node._x, node._y, node._w, node._h, { fill: theme.box, stroke: kc, lw: 1.1, r: 5 });
      pen.rect(node._x + 1.2, node._y + 3, TAB_W, node._h - 6, { fill: kc, r: 1.6 });
      const tx = node._x + TAB_W + 2 + BOX_PAD_X;
      let ty = node._y + BOX_PAD_Y;
      for (const line of node._title) {
        pen.text(tx, ty, line, { font: FONT.bold, size: node._tfs, color: theme.ink });
        ty += node._tlead;
      }
      ty += 3;
      for (const line of node._d) {
        pen.text(tx, ty, line, { size: node._dfs, color: theme.dim });
        ty += node._dfs * DETAIL_LEAD;
      }
      pen.text(node._x + node._w - BOX_PAD_X - 30, node._y + 5, `${p.id.slice(1)}.${String(node._idx + 1).padStart(2, "0")}`, {
        size: 6.4, color: theme.faint, align: "right",
      });
    }
  }

  drawConnectors(pen, theme, phases, links, L);
  drawLegend(pen, theme, links);
  return pen;
}

function drawConnectors(pen, theme, phases, links, L) {
  const stride = 4.4;
  const nCol = phases.length;
  // Rails live in the gaps between columns, so their slot has to be allocated
  // PER GAP (a global index would push rails over the neighbouring column).
  const railCount = new Map();
  const railSlot = (gap) => {
    const k = railCount.get(gap) || 0;
    railCount.set(gap, k + 1);
    return k;
  };
  for (const l of links.fwd) {
    l.gapSrc = l.from._col;
    l.gapTgt = l.to._col - 1;
  }
  for (const l of links.back) {
    l.gapSrc = l.from._col - 1;
    l.gapTgt = l.to._col;
  }
  for (const l of [...links.fwd, ...links.back]) {
    if (l.gapSrc < 0 || l.gapSrc >= nCol - 1 || l.gapTgt < 0 || l.gapTgt >= nCol - 1) {
      l.skip = true;
      continue;
    }
    l.slotSrc = railSlot(l.gapSrc);
    l.slotTgt = railSlot(l.gapTgt);
  }

  // 1. order inside a phase - solid vertical arrows
  for (const p of phases) {
    p.nodes.forEach((node, i) => {
      const next = p.nodes[i + 1];
      if (!node.chain || !next) return;
      const y0 = node._y + node._h + 2;
      if (next._y - 8 <= y0) return;
      pen.line(p._cx, y0, p._cx, next._y - 7, { stroke: theme.chain, lw: 1.2 });
      pen.head(p._cx, next._y - 1.5, 90, 6.4, theme.chain);
    });
  }
  // 2. forward dependencies - down to the bottom bus, across, then up into the target
  const labelJobs = [];
  const placeLabel = (l, railA, railB, laneY) => {
    const size = 7.4;
    const w = l.label.length * CW * size;
    const pad = M + 4;
    const centre = (railA + railB) / 2;
    // Centre on the span; if the span is narrower than the text (adjacent
    // columns) let it spill symmetrically but never off the page.
    let cx = centre;
    if (cx - w / 2 < pad) cx = pad + w / 2;
    if (cx + w / 2 > pen.w - pad) cx = pen.w - pad - w / 2;
    labelJobs.push({ l, cx, laneY, size, room: Math.floor((pen.w - 2 * pad) / (CW * size)) });
  };

  for (const l of links.fwd) {
    if (l.skip) continue;
    const srcP = phases[l.from._col], tgtP = phases[l.to._col];
    const railA = srcP._x + srcP._w + 5 + l.slotSrc * stride;
    const railB = tgtP._x - 5 - l.slotTgt * stride;
    const laneY = L.bottomBusY + l.lane * LANE_BOTTOM;
    pen.poly([
      [l.from._x + l.from._w + 1.5, l.from._cy], [railA, l.from._cy],
      [railA, laneY], [railB, laneY], [railB, l.to._cy], [l.to._x - 1.5, l.to._cy],
    ], { stroke: theme.bus, lw: 0.9, dash: 3.2 });
    pen.head(l.to._x, l.to._cy, 0, 6.2, theme.bus);
    placeLabel(l, railA, railB, laneY);
  }
  // 3. backward dependencies - up to the top bus, back, then down into the target
  for (const l of links.back) {
    if (l.skip) continue;
    const srcP = phases[l.from._col], tgtP = phases[l.to._col];
    const railA = srcP._x - 5 - l.slotSrc * stride;
    const railB = tgtP._x + tgtP._w + 5 + l.slotTgt * stride;
    const laneY = L.topBusY + l.lane * LANE_TOP;
    pen.poly([
      [l.from._x - 1.5, l.from._cy], [railA, l.from._cy],
      [railA, laneY], [railB, laneY], [railB, l.to._cy], [l.to._x + l.to._w + 1.5, l.to._cy],
    ], { stroke: theme.bus, lw: 0.9, dash: 3.2 });
    pen.head(l.to._x + l.to._w, l.to._cy, 180, 6.2, theme.bus);
    placeLabel(l, railB, railA, laneY); // note the order: spans run right-to-left
  }
  // labels last so no rail can ever cross its own caption
  for (const j of labelJobs) {
    pen.text(j.cx, j.laneY - 9.6, j.l.label, { size: j.size, color: theme.bus, align: "center", maxChars: j.room });
  }
  return railCount;
}

// ---------------------------------------------------------------------------
// 7. Minimal PDF 1.7 writer (no compression, base-14 fonts, latin-1 safe)
// ---------------------------------------------------------------------------
function buildPdf(pages) {
  const n = pages.length;
  const fontReg = 3 + 2 * n;
  const fontBold = fontReg + 1;
  const fontItalic = fontReg + 2;
  const total = 3 + 2 * n + 3; // catalog + pages + page objs + content streams + 3 fonts
  const res = `/Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R /F3 ${fontItalic} 0 R >>`;
  const bodies = new Array(total + 1).fill(null);

  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  bodies[2] = `<< /Type /Pages /Count ${n} /Kids [${pages.map((_, i) => `${3 + i} 0 R`).join(" ")}] >>`;

  pages.forEach((p, i) => {
    const stream = Buffer.from(p.pen.ops.join("\n"), "latin1");
    bodies[3 + i] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(p.w)} ${fmt(p.h)}] ` +
      `/Resources << ${res} >> /Contents ${3 + n + i} 0 R >>`;
    bodies[3 + n + i] = { stream };
  });
  bodies[fontReg] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>";
  bodies[fontBold] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>";
  bodies[fontItalic] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique /Encoding /WinAnsiEncoding >>";

  const chunks = [Buffer.from("%PDF-1.7\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let size = chunks[0].length;
  const offsets = new Array(total + 1).fill(0);
  for (let id = 1; id <= total; id++) {
    offsets[id] = size;
    const body = bodies[id];
    let buf;
    if (body && typeof body === "object" && body.stream) {
      buf = Buffer.concat([
        Buffer.from(`${id} 0 obj\n<< /Length ${body.stream.length} >>\nstream\n`, "latin1"),
        body.stream,
        Buffer.from("\nendstream\nendobj\n", "latin1"),
      ]);
    } else {
      buf = Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "latin1");
    }
    chunks.push(buf);
    size += buf.length;
  }

  const xrefAt = size;
  let xref = `xref\n0 ${total + 1}\n0000000000 65535 f\r\n`;
  for (let id = 1; id <= total; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n\r\n`;
  chunks.push(Buffer.from(xref, "latin1"));
  chunks.push(Buffer.from(
    `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`, "latin1"
  ));
  return { buffer: Buffer.concat(chunks), offsets, xrefAt, total, pages: n };
}

/** Re-read the produced bytes and verify the structure we claim. */
function validatePdf(pdf) {
  const errs = [];
  const buf = pdf.buffer;
  if (buf.subarray(0, 8).toString("latin1") !== "%PDF-1.7") errs.push("bad header");
  if (!buf.subarray(-8).toString("latin1").includes("%%EOF")) errs.push("missing EOF marker");
  const at = buf.lastIndexOf(Buffer.from("xref\n0 "));
  if (at < 0) errs.push("xref table not found");
  else if (at !== pdf.xrefAt) errs.push(`startxref ${pdf.xrefAt} != actual ${at}`);
  for (let id = 1; id <= pdf.total; id++) {
    const want = Buffer.from(`${id} 0 obj`);
    if (!buf.subarray(pdf.offsets[id], pdf.offsets[id] + want.length).equals(want)) {
      errs.push(`object ${id} offset mismatch`);
    }
  }
  const text = buf.toString("latin1");
  const re = /<< \/Length (\d+) >>\nstream\n/g;
  let m, streams = 0;
  while ((m = re.exec(text)) !== null) {
    streams++;
    const start = m.index + m[0].length;
    const declared = Number(m[1]);
    const end = text.indexOf("\nendstream", start);
    if (end < 0) { errs.push("stream without endstream"); continue; }
    if (end - start !== declared) errs.push(`stream length ${declared} != actual ${end - start}`);
  }
  if (streams !== pdf.pages) errs.push(`expected ${pdf.pages} streams, found ${streams}`);
  // unbalanced graphics state or text objects would corrupt rendering mid-page
  const q = (text.match(/(?:^|\s)q(?:\s|$)/g) || []).length;
  const Q = (text.match(/(?:^|\s)Q(?:\s|$)/g) || []).length;
  const bt = (text.match(/(?:^|\s)BT(?:\s|$)/g) || []).length;
  const et = (text.match(/(?:^|\s)ET(?:\s|$)/g) || []).length;
  if (q !== Q) errs.push(`unbalanced q/Q (${q} vs ${Q})`);
  if (bt !== et) errs.push(`unbalanced BT/ET (${bt} vs ${et})`);
  if (/NaN|undefined/.test(text)) errs.push("content contains NaN/undefined");
  if (/[\u0100-\uFFFF]/.test(text)) errs.push("content contains non latin-1 characters");
  return { errs, streams, q, bt };
}

/** Geometry checks: nothing off-canvas, nothing overlapping inside a column. */
function validateLayout(phases, L, page, links) {
  const errs = [];
  const seen = new Set();
  for (const p of phases) {
    for (const node of p.nodes) {
      if (seen.has(node.id)) errs.push(`duplicate node id ${node.id}`);
      seen.add(node.id);
      if (node._badLink) errs.push(`${node.id} links to unknown id ${node._badLink}`);
      if (node._y < 0 || node._y + node._h > page.h) errs.push(`${node.id} vertical overflow`);
      if (node._x < 0 || node._x + node._w > page.w) errs.push(`${node.id} horizontal overflow`);
    }
    for (let i = 1; i < p.nodes.length; i++) {
      const a = p.nodes[i - 1], b = p.nodes[i];
      if (a._y + a._h > b._y + 0.01) errs.push(`column ${p.id}: ${a.id} overlaps ${b.id}`);
    }
  }
  const legendTop = page.h - M - LEGEND_H;
  const lastFwdLane = L.bottomBusY + (links.fwd.length - 1) * LANE_BOTTOM;
  if (lastFwdLane + 4 > legendTop) errs.push("forward bus lanes collide with the legend strip");
  const headerBottom = M + TITLE_BLOCK_H + PHASE_HEAD_H;
  if (L.topBusY - 10 < headerBottom) errs.push("backward bus lanes collide with the phase headers");
  if (L.topBusY + (links.back.length - 1) * LANE_TOP > L.rowY[0]) errs.push("backward bus lanes collide with row 1");
  if (L.rowsBottom > legendTop) errs.push("rows overflow into the legend strip");

  const perGap = new Map();
  for (const l of [...links.fwd, ...links.back]) {
    if (l.skip) { errs.push(`link ${l.key} had no valid gap`); continue; }
    for (const [gap, slot] of [[l.gapSrc, l.slotSrc], [l.gapTgt, l.slotTgt]]) {
      perGap.set(gap, Math.max(perGap.get(gap) || 0, slot + 1));
    }
  }
  for (const [gap, count] of perGap) {
    if (5 + count * 4.4 > COL_GAP) errs.push(`gap ${gap} needs ${count} rails - wider than the ${COL_GAP}pt gap`);
  }
  return errs;
}

// ---------------------------------------------------------------------------
// 8. Mermaid export (same model, editable elsewhere)
// ---------------------------------------------------------------------------
function buildMermaid(phases, links) {
  // Labels are quoted, so only HTML-significant characters need escaping -
  // parentheses, colons and brackets survive intact.
  const label = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const out = ["%% nextCall - complete user activity map", "%% generated by scripts/generate-activity-map.mjs", "flowchart TB"];
  for (const p of phases) {
    out.push(`  subgraph ${p.id}["${label(p.title)} - ${label(p.sub)}"]`);
    out.push("    direction TB");
    for (const node of p.nodes) {
      out.push(`    ${node.id}["<b>${label(node.t)}</b><br/><i>${label(node.d)}</i>"]`);
    }
    out.push("  end");
  }
  for (const p of phases) {
    p.nodes.forEach((node, i) => {
      const next = p.nodes[i + 1];
      if (node.chain && next) out.push(`  ${node.id} --> ${next.id}`);
    });
  }
  for (const l of links.all) {
    const tag = l.forward ? "-->" : "-.->";
    out.push(`  ${l.sources.map((s) => s.id).join(" & ")} ${tag}|"${label(l.label)}"| ${l.to.id}`);
  }
  for (const p of phases) {
    out.push(`  style ${p.id} fill:#f7f9fc,stroke:${p.accent},stroke-width:1px`);
  }
  return `${out.join("\n")}\n`;
}

/** Bottom strip: reading guide + node-kind legend + always-on cross-cutting rules. */
function drawLegend(pen, theme, links) {
  const top = MASTER.h - M - LEGEND_H;
  pen.rect(M, top, MASTER.w - 2 * M, LEGEND_H, { fill: theme.legend, stroke: theme.legendLine, lw: 1, r: 8 });
  const inner = MASTER.w - 2 * M - 28;
  const colW = inner / 4;
  const fs = 7.8, lead = 9.7;

  const heading = (x, label) =>
    pen.text(x, top + 9, label, { font: FONT.bold, size: 8.8, color: theme.ink });

  const block = (x, y, lines) => {
    let cy = y;
    for (const line of lines) {
      const wrapped = wrap(line, fs, colW - 6, 2);
      for (const wl of wrapped) {
        pen.text(x, cy, wl, { size: fs, color: theme.dim, maxChars: 200 });
        cy += lead;
      }
    }
    return cy;
  };

  const x0 = M + 14;
  heading(x0, "HOW TO READ THIS MAP");
  block(x0, top + 24, [
    "Columns are phases of the journey, left to right: an anonymous visitor, then a paying tenant, then the AI that works for them.",
    "Each box is one activity. The bold line is the human action; the grey text is what our code and the provider actually do about it.",
    "The corner number (e.g. 9.04) identifies the box, and matches its entry on the text pages that follow this one.",
    `Solid arrows chain the order inside a phase. Dashed arrows are dependencies between phases: ${links.all.length} of them, labelled on the line, routed through the bus lanes above and below the columns.`,
  ]);

  const x1 = x0 + colW;
  heading(x1, "WHAT THE BOX COLOUR MEANS");
  let ky = top + 24;
  for (const key of Object.keys(KINDS)) {
    pen.rect(x1, ky + 1, 8, 8, { fill: hex(KINDS[key].color), r: 1.5 });
    pen.text(x1 + 14, ky, KINDS[key].label, { size: fs, color: theme.dim, maxChars: Math.floor((colW - 20) / (0.6 * fs)) });
    ky += 13;
  }
  pen.text(x1, ky + 2, MASTER_ONLY
    ? "Standalone one-page edition. The 13-page edition of this PDF prints the full text of every activity."
    : "Pages 2+ print the full text of every activity, so nothing here is truncated.", {
    size: fs, color: theme.faint, maxChars: Math.floor(colW / (0.6 * fs)),
  });

  const x2 = x1 + colW;
  heading(x2, "ALWAYS-ON CROSS-CUTTING RULES");
  block(x2, top + 24, [
    "Verify: Twilio, Retell, Paddle, Meta and Telegram edges all check the sender, all fail closed, all use timing-safe compares.",
    "Idempotency: webhook_events dedupes every provider event, so a retry never double-counts minutes or double-books a calendar slot.",
    "Recover: any provider call can be wrapped by executeWithRecovery - bounded retry, registry-only actions, AI consulted but never obeyed, then fail closed into an incident.",
    "Isolate: one businesses doc per Clerk user; AI prompts are assembled per call, never shared mutable state.",
    "Gate: trial, minute-limit, SMS-verification and plan checks are re-evaluated server-side on every request, not just in the UI.",
  ]);

  const x3 = x2 + colW;
  heading(x3, "REPRODUCE / EDIT");
  block(x3, top + 24, [
    "Source of truth: scripts/generate-activity-map.mjs - edit the PHASES array and re-run to regenerate this PDF.",
    "Command: node scripts/generate-activity-map.mjs",
    "Mermaid source for the same model: docs/nextCall-user-activity-map.mmd",
    "The map is derived from the code itself: routes, lib modules, crons and the recovery engine, cross-checked against the 138-test suite.",
  ]);
}

// ---------------------------------------------------------------------------
// 6. Spec-sheet pages (A3 landscape, one phase per page) - full untruncated text
// ---------------------------------------------------------------------------
let MASTER_ONLY = false;

const KIND_TAG = { user: "OWNER", app: "OUR CODE", ext: "PROVIDER", auto: "AUTOMATED", admin: "STAFF", data: "STORED" };

function paginateSpec(phases) {
  const pages = [];
  const availH = SPEC.h - 2 * M - 56 - 10;
  for (const phase of phases) {
    let fs = 7.6, blocks = [];
    for (;;) {
      blocks = phase.nodes.map((node, i) => {
        const tLines = wrap(node.t, 9.4, SPEC.w - M * 2 - 52 - 82, 2);
        const dLines = wrap(node.d, fs, SPEC.w - M * 2 - 52 - 82, 60);
        return { node, i, tLines, dLines, h: tLines.length * 11.4 + 3 + dLines.length * (fs * 1.25) };
      });
      const total = blocks.reduce((a, b) => a + b.h + 11, 0);
      if (total <= availH || fs <= 6.4) break;
      fs -= 0.4;
    }
    // greedy pagination (only splits if a phase genuinely cannot fit one page)
    let chunk = [], used = 0, part = 0;
    for (const b of blocks) {
      if (used + b.h + 11 > availH && chunk.length) {
        pages.push({ phase, blocks: chunk, fs, part: part++ });
        chunk = []; used = 0;
      }
      chunk.push(b);
      used += b.h + 11;
    }
    if (chunk.length) pages.push({ phase, blocks: chunk, fs, part: part++ });
  }
  return pages;
}

function drawSpecPage(entry, meta) {
  const pen = new Pen(SPEC.w, SPEC.h, LIGHT);
  const { phase, blocks, fs } = entry;
  pen.rect(0, 0, SPEC.w, SPEC.h, { fill: LIGHT.page });
  pen.rect(M, M, SPEC.w - 2 * M, 40, { fill: hex(phase.accent), r: 6 });
  pen.text(M + 14, M + 9, `${phase.id.slice(1)} - ${phase.title}`, { font: FONT.bold, size: 12, color: [1, 1, 1], maxChars: 74 });
  pen.text(M + 14, M + 25, `${phase.sub} - ${phase.nodes.length} activities${entry.part > 0 ? ` (continued, part ${entry.part + 1})` : ""}`, { size: 8.4, color: hex("#eef4ff"), maxChars: 90 });
  pen.text(SPEC.w - M - 14, M + 9, `SPEC SHEET - PAGE ${meta.pageNo} OF ${meta.pageCount}`, { font: FONT.bold, size: 9.5, color: [1, 1, 1], align: "right" });
  pen.text(SPEC.w - M - 14, M + 25, "full text of every box on the master map (page 1)", { size: 8, color: hex("#eef4ff"), align: "right" });

  const idxW = 52, rightPad = 82;
  const textX = M + idxW;
  const textW = SPEC.w - M - textX - rightPad;
  let y = M + 56;
  for (const b of blocks) {
    const kc = hex(KINDS[b.node.k].color);
    pen.text(M, y + 2, `${phase.id.slice(1)}.${String(b.i + 1).padStart(2, "0")}`, { font: FONT.bold, size: 8.8, color: kc });
    pen.rect(M + 30, y + 3, 2.4, 9, { fill: kc, r: 1 });
    pen.text(SPEC.w - M - 8, y + 2, KIND_TAG[b.node.k], { font: FONT.bold, size: 6.8, color: kc, align: "right" });
    pen.text(SPEC.w - M - 8, y + 12, b.node.link ? `-> ${b.node.link}` : "", { size: 6.2, color: LIGHT.faint, align: "right", maxChars: 20 });
    let ty = y;
    for (const line of b.tLines) {
      pen.text(textX, ty, line, { font: FONT.bold, size: 9.4, color: LIGHT.ink, maxChars: 200 });
      ty += 11.4;
    }
    ty += 3;
    for (const line of b.dLines) {
      pen.text(textX, ty, line, { size: fs, color: LIGHT.dim, maxChars: 240 });
      ty += fs * 1.25;
    }
    y += b.h + 11;
    pen.line(textX, y - 5, SPEC.w - M, y - 5, { stroke: LIGHT.legendLine, lw: 0.8 });
  }
  pen.text(M, SPEC.h - M + 2, `nextCall activity map - generated ${meta.date} from scripts/generate-activity-map.mjs`, { size: 7, color: LIGHT.faint });
  return pen;
}


// ---------------------------------------------------------------------------
// 9. Main
// ---------------------------------------------------------------------------
function main() {
  const meta = { date: new Date().toISOString().slice(0, 10) };
  MASTER_ONLY = process.argv.includes("--master-only");
  const masterOnly = MASTER_ONLY;
  const total = PHASES.reduce((a, p) => a + p.nodes.length, 0);

  // Lay out first so the validators can inspect exactly the geometry drawMaster uses.
  const L = layout(PHASES, MASTER);
  const index = new Map();
  for (const p of PHASES) for (const node of p.nodes) index.set(node.id, node);
  const links = buildLinks(PHASES, index);
  const layoutErrs = validateLayout(PHASES, L, MASTER, links);

  const masterPen = drawMaster(PHASES, LIGHT, meta);
  const entries = masterOnly ? [] : paginateSpec(PHASES);
  const pageCount = 1 + entries.length;
  const pages = [{ pen: masterPen, w: MASTER.w, h: MASTER.h }];
  entries.forEach((entry, i) => {
    pages.push({
      pen: drawSpecPage(entry, { ...meta, pageNo: i + 2, pageCount }),
      w: SPEC.w,
      h: SPEC.h,
    });
  });

  const pdf = buildPdf(pages);
  const pdfCheck = validatePdf(pdf);
  const overflows = pages.flatMap((p, i) => p.pen.overflows.map((o) => `page ${i + 1}: ${o}`));

  const outDir = path.join(process.cwd(), "docs");
  fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, masterOnly ? "nextCall-user-activity-map-onepage.pdf" : "nextCall-user-activity-map.pdf");
  const mmdPath = path.join(outDir, "nextCall-user-activity-map.mmd");
  fs.writeFileSync(pdfPath, pdf.buffer);
  fs.writeFileSync(mmdPath, buildMermaid(PHASES, links), "utf8");

  const truncated = [];
  for (const p of PHASES) {
    p.nodes.forEach((node, i) => {
      if (node._d[node._d.length - 1].endsWith("..")) {
        truncated.push(`${p.id.slice(1)}.${String(i + 1).padStart(2, "0")} ${node.id}`);
      }
    });
  }

  const line = "-".repeat(76);
  const fallbackLabels = links.all.filter((l) => !LINK_LABELS[l.key]);
  const rows = [
    `phases ................ ${PHASES.length}`,
    `activities ............ ${total}`,
    `cross-phase links ..... ${links.all.length} (${links.fwd.length} forward, ${links.back.length} backward, ${fallbackLabels.length} auto-labelled)`,
    `master page ........... ${fmt(MASTER.w)}x${fmt(MASTER.h)}pt (A0 landscape), ${L.rows} rows, ${fmt(L.corridor)}pt corridors`,
    `type auto-fit ......... ${L.scale === 1 ? "1.00 (no downscale needed)" : L.scale.toFixed(2)} - boxes ${fmt(L.sumH)}pt vs ${fmt(MASTER.h - (M + TITLE_BLOCK_H + PHASE_HEAD_H) - LEGEND_H - M)}pt of row space`,
    `detail font sizes ..... ${[...new Set(PHASES.flatMap((p) => p.nodes.map((x) => x._dfs)))].sort((a, b) => b - a).join(", ")}pt`,
    `spec pages ............ ${entries.length} (A3 landscape, one phase per page)`,
    `pdf ................... ${pages.length} pages, ${(pdf.buffer.length / 1024).toFixed(0)} KB`,
    `wrote ................. ${path.relative(process.cwd(), pdfPath)}`,
    `wrote ................. ${path.relative(process.cwd(), mmdPath)}`,
  ];
  console.log(line);
  console.log("nextCall - complete user activity map");
  console.log(line);
  for (const r of rows) console.log(`  ${r}`);
  console.log(line);
  console.log(`  pdf structure ......... ${pdfCheck.errs.length ? `FAIL (${pdfCheck.errs.length})` : "OK"} - ${pdfCheck.streams} content streams, xref + lengths + q/Q (${pdfCheck.q}) + BT/ET (${pdfCheck.bt}) all balanced`);
  console.log(`  geometry .............. ${layoutErrs.length ? `FAIL (${layoutErrs.length})` : "OK"} - no overlaps, nothing off-canvas, bus lanes clear of boxes`);
  console.log(`  text inside page ...... ${overflows.length ? `FAIL (${overflows.length})` : "OK"} - every string measured against its page box`);
  if (truncated.length) {
    console.log(`  trimmed on page 1 ..... ${truncated.length} box(es) end in ".." on the master map (full text is on the spec pages):`);
    console.log(`                          ${truncated.join(", ")}`);
  }
  for (const e of [...pdfCheck.errs, ...layoutErrs, ...overflows]) console.log(`  ERROR: ${e}`);
  if (fallbackLabels.length) console.log(`  NOTE: auto-labelled connectors: ${fallbackLabels.map((l) => `${l.key} (${l.label})`).join(", ")}`);
  if (pdfCheck.errs.length || layoutErrs.length || overflows.length) process.exitCode = 1;
}

main();

