# Handover Bug-Fix Roadmap (Phases 0–3, "All bugs, no infra")

## Ground rules — how we avoid breaking anything
- **Tag first:** `git tag pre-handover-fixes` → instant full rollback point.
- **Branch:** all work on `fix/handover`; every single fix = one isolated commit.
- **Per-fix gate:** `npx vitest run` (92 tests must stay green) + `npx tsc --noEmit` (zero NEW errors vs. baseline of ~99 pre-existing).
- **Per-phase gate:** full `npm run build` + dev-server smoke test → you review the diff → merge ONE phase to main → auto-deploy → watch `/api/health` → next phase.
- **Rollback:** any regression = `git revert <one commit>`. Worst case = `git reset --hard pre-handover-fixes`.
- **New regression tests added:** concurrent-chat-writer test (proves the race fix), timezone helper test, memory-store operator tests.

## Phase 0 — Safety net (~30 min)
1. Tag current main, create `fix/handover` branch.
2. Baseline: vitest green, build green, record tsc error count.

## Phase 1 — Critical backend bugs (~4–5 hrs, 7 commits)

**1.1 Emergency transfer** (`app/api/webhooks/retell/emergency/route.ts`): hoist business fetch above the bridge; use subaccount-scoped Twilio client via existing `getBusinessClient` pattern (`lib/sms-compliance.ts:99-107`); Telegram alert on bridge failure. *Live check: test call with emergency keyword → owner's phone rings.*

**1.2 Telegram reply routing** (`lib/notify-admin.ts`, `app/api/chat/send/route.ts`): `notifyAdminChat` returns `{ok, messageId}`; `chat/send` persists `telegram_message_id` on the message so the webhook's primary lookup actually matches; text/only-conversation fallbacks stay as safety net.

**1.3 Chat message race → `$push`** (`chat/send`, `admin/chat/reply`, `webhooks/telegram`, `webhooks/meta/inbound`, `lib/astra.ts`): replace whole-array read-modify-write with `$push` (+ trim; in-memory fallback's `updateOne` extended to support `$push`). Regression test: two interleaved writers → both messages present.

**1.4 Paddle races + money** (3 commits):
- **1.4a Referral atomic claim:** conditional `updateOne({..., referral_applied_at: {$exists: false}}, ...)`; credit only if matched; self-referral guard. `$exists` support in memory store.
- **1.4b Renewals stop wiping purchased minutes:** `$set minutes_limit` only when plan changed or business is new; handle `subscription.updated` (map price_id → plan).
- **1.4c Double provisioning:** idempotent `provisionTwilioNumber` — reuse existing subaccount by friendlyName before creating a new one.

## Phase 2 — Backend reliability (~3–4 hrs, 8 commits)
- **2.1 Per-business timezone:** `business_timezone` field (default `America/New_York`) in SettingsForm + update-settings whitelist; Intl-based `zonedTimeToUtc()` helper (no new deps) used in calendar events and reminder formatting; unit tested.
- **2.2 Reminders cron:** schedule `0 1 * * *` → `0 * * * *` (hourly) so the 2h window covers all appointments.
- **2.3 RETELL_AGENT_ID guard:** fail-fast + Telegram alert in `twilio/inbound`.
- **2.4 job-done followup:** write `job_status: "pending"` at call-doc creation.
- **2.5 WhatsApp:** `whatsapp/route.ts` re-exports the full sms-inbound handler (already handles `whatsapp:` end-to-end); delete store-only stub; both URLs keep working.
- **2.6 Provisioning cleanup:** persist subaccount SID before number purchase; close subaccount on failure.
- **2.7 Astra fail-fast:** production + missing ASTRA env = loud crash, not silent in-memory data loss (fallback stays for dev/test).
- **2.8 Injection fixes:** escapeHtml in feature-request email + Paddle Telegram message; fix `clerk_user_id`→`business_id` filter so feature requests persist.

## Phase 3 — Landing + dashboard UI (~4–5 hrs, 8 commits)
- **3.1 styled-jsx registry:** `app/registry.tsx` per the official Next 16 recipe (verified in bundled docs) → fixes unstyled Integrations flash.
- **3.2 Hydration:** refCode (`app/page.tsx:46`) + referralLink (`SettingsForm:111`) moved to `useState`+`useEffect`; toast timer cleanup.
- **3.3 Duplicate IDs:** remove ids from "pricing"/"faq"/"ask" scene wrappers (verified SceneStack never reads them).
- **3.4 Desktop anchor nav:** Navigation dispatches `nav-scroll` event; SceneStack listens and smooth-scrolls via Lenis to the measured scene offset; native anchors untouched on mobile.
- **3.5 Dashboard charts:** sentiment % as a real percentage ("—" when no calls); legend swatches match pie colors; demo-mode slices get real colors.
- **3.6 A11y/UX:** CallRow keyboard support; `aria-pressed` on integration icons + `aria-live` card; single shared AudioContext; NotificationBell "Just now" fix.
- **3.7 Images:** 3 background PNGs (~2.3MB) → WebP.
- **3.8 Reduced motion:** `Reveal` + `Section3D` respect `useReducedMotion`.

## After each phase merge — your live checklist
1. Test call with emergency keyword → owner's phone rings (1.1)
2. Dashboard message → Telegram reply → routes to SAME business (1.2)
3. Paddle sandbox purchase + renewal → minutes preserved, upgrades apply (1.4)
4. WhatsApp text → AI replies (2.5)

**Total: ~13 hours of my work ≈ 1.5–2 days, deployed phase-by-phase with your review between each.**