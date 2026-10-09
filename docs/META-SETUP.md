# Meta (Messenger + Instagram DM) — Setup, Verification & App Review Guide

This is the operational checklist for wiring nextCall to Meta. It is written against
**what the code in this repo actually does** (see the audit below), so the values in
Phase D/E are not generic — they are the exact values the app will validate.

---

## 0. TL;DR — the 6 things that unblock you

1. App `999451746008588` already exists. Add the **Messenger** product + the
   **Instagram** settings to it.
2. Set the webhook Callback URL to `https://getnextcall.com/api/webhooks/meta/inbound`
   and the Verify Token to the value of `META_VERIFY_TOKEN` (`nextCall@1309680864`).
3. Subscribe the webhook fields `messages`, `messaging_postbacks` (+ IG equivalents).
4. Complete **Business Verification** in Business Manager (hard requirement for
   Advanced Access).
5. Complete **Access Verification** (Tech Provider) — required because you call
   `pages_show_list` / `business_management` / `instagram_basic` on *other*
   businesses' assets.
6. Submit **App Review** for `pages_messaging`, `instagram_manage_messages`,
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`,
   `business_management`, then flip the app to **Live**.

Without 4 + 5 + 6, the app only works for people who have a **role** on the app
(you, your testers). Real customers' Pages will receive nothing.

---

## 1. Audit — how this codebase uses Meta

### 1.1 Environment variables

| Variable | Used by | Notes |
| --- | --- | --- |
| `META_APP_ID` | `app/api/integrations/meta/auth/route.ts`, `callback/route.ts` | OAuth `client_id` / token exchange |
| `META_APP_SECRET` | `callback/route.ts`, `app/api/webhooks/meta/inbound/route.ts` | Token exchange **and** `x-hub-signature-256` HMAC verify |
| `META_VERIFY_TOKEN` | `app/api/webhooks/meta/inbound/route.ts` (GET handshake) | Must equal what you type into the dashboard |
| `NEXT_PUBLIC_APP_URL` | `auth/route.ts`, `callback/route.ts` | Builds the OAuth redirect URI |

> `MESSENGER_PAGE_ACCESS_TOKEN` and `INSTAGRAM_PAGE_ACCESS_TOKEN` exist in `.env.local`
> but are **referenced nowhere in the code** — they are dead/legacy. The app gets Page
> tokens through OAuth and stores them per-tenant in AstraDB. You can delete them.

### 1.2 The four endpoints

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/integrations/meta/auth` | GET | Clerk session | Builds the FB OAuth dialog URL, sets an `oauth_state` CSRF cookie |
| `/api/integrations/meta/callback` | GET | Clerk session | code → short token → long-lived token → `/me/accounts` → stores Page + IG on the business doc |
| `/api/integrations/meta/disconnect` | POST | Clerk session | Nulls all `meta_*` fields |
| `/api/webhooks/meta/inbound` | GET + POST | public (`proxy.ts`) | GET = verification handshake, POST = message events |

`proxy.ts` lists `/api/webhooks/(.*)` as a public route, so Meta can reach the webhook
without a Clerk session. Good.

### 1.3 End-to-end flow

```
Customer clicks "Connect" (Premium users only)
  → GET /api/integrations/meta/auth
      scope = pages_show_list, pages_messaging, instagram_manage_messages,
              pages_read_engagement, business_management
  → facebook.com/v19.0/dialog/oauth  (redirect_uri = <APP_URL>/api/integrations/meta/callback)
  → callback: code → short-lived → long-lived user token
      → GET /me/accounts                       (fallback: /me/businesses → /owned_pages)
      → picks pagesData.data[0]  ← FIRST page only
      → GET /{pageId}?fields=instagram_business_account{id,name}
      → GET /{pageId}/picture
      → AstraDB $set: meta_page_access_token, meta_page_id, meta_page_name,
                       meta_page_picture, meta_ig_business_id, meta_ig_business_name

Customer DMs the Page / IG account
  → POST /api/webhooks/meta/inbound
      verify x-hub-signature-256 (HMAC-SHA256 with META_APP_SECRET)
      object === "page"       → Messenger events
      object === "instagram"  → Instagram events
      idempotency via webhook_events collection
      3-second human buffer, then re-read conversation
      business = connectedBusinesses.find(b => b.meta_page_id === event.recipient.id)
      gate: business.plan_type must === "premium"
      GPT-4o-mini returns JSON {intent, sentiment, confidence, leadStage, reply, ...}
      deterministic overrides (confidence < 0.7 → ESCALATE, angry → ESCALATE, ...)
      POST graph.facebook.com/v19.0/me/messages  { recipient: {id: senderId}, message: {text} }
```

### 1.4 Premium gating

`app/api/webhooks/meta/inbound/route.ts` returns early unless
`business.plan_type === 'premium'`. The Settings UI (`SettingsForm.tsx`) also only
renders the Connect card when `isPremium`. So **Meta DMs are a Premium feature** —
that matches `components/pricing.tsx` ("WhatsApp, Facebook & Instagram chat-back").

### 1.5 Where Meta appears (or doesn't) in the UI

- `SettingsForm.tsx` → `?focus=integrations` tab: Connect / Connected / Disconnect card.
- `lib/setup-progress.ts` → the 10-item setup checklist does **not** include Meta
  (correct — it's an optional Premium add-on, not a blocking setup step).
---

## 2. Bugs / gaps found in the current Meta code

Fix these before you submit for App Review — reviewers test the happy path and an
Instagram DM will not answer as written today.

### 2.1 Instagram messages never match a business (functional bug)

Instagram webhooks send `object: "instagram"`, and per Meta's payload docs
`messaging[].recipient.id` is the **Instagram Professional Account ID**, not the
Facebook Page ID. But `handleMessage()` matches:

```ts
const business = connectedBusinesses.find(b => String(b.meta_page_id) === pageId);
```

`meta_page_id` is the Page ID, so the lookup fails and every IG DM is dropped with
`No business found for Page ID`. (The POST handler's `object === 'instagram'` loop
itself mirrors the `object === 'page'` loop correctly — the only problem is the lookup
key.)

**Fix:** resolve the owner by either Page ID **or** IG business ID, e.g.

```ts
const business = connectedBusinesses.find(
  (b) => String(b.meta_page_id) === ownerId || String(b.meta_ig_business_id) === ownerId
);
```

…where `ownerId` is `event.recipient.id`, and store `meta_ig_business_id` exactly as
the callback already does (`instagram_business_account.id`). Also send the reply with
the Page token that owns the IG account (`/me/messages` works because the Page token is
linked — keep `business.meta_page_access_token`).

### 2.2 Only the first Page / IG account is connected

`callback/route.ts` does `const page = pagesData.data[0];`. A business with several
Pages gets whichever Meta returns first, with no picker. For App Review ("Apps for
Other Businesses") reviewers often have multiple assets — either add a small
page-picker step or document clearly that only the primary Page connects.

### 2.3 No `pages_manage_metadata` scope

Subscribing a Page to the webhook (and re-subscribing after a token refresh) needs
`pages_manage_metadata`. The current scope list in `auth/route.ts` omits it, so if you
ever programmatically call `POST /{page-id}/subscribed_apps`, that call will fail.
Add it to the scopes array if you subscribe from code; otherwise subscribe manually in
the dashboard (Phase E).

### 2.4 No token refresh / expiry handling

The long-lived user token lasts ~60 days and Page tokens derived from it share that
life. Nothing refreshes or alerts on expiry, so a connected tenant silently stops
working. Consider a cron that re-exchanges or notifies.

### 2.5 The 200 OK is sent late (latency risk)

The handler returns `{status:"ok"}` 200 at the end, but only **after**
`await handleMessage(event)` has run — and `handleMessage` awaits a 3-second human
buffer **plus** a GPT-4o-mini call. Meta expects the webhook response within ~5
seconds, so a slow OpenAI response can push you over budget and trigger Meta retries
(which your idempotency check then swallows). Consider returning 200 first and
processing the message in `after()`/a queue.

### 2.6 Security: rotate secrets

`.env.local` contains live secrets (App Secret, tokens, API keys, DB token). It is
git-ignored and **not tracked** (`git ls-files` returns nothing for it) — good. But
since these values have been handled in plaintext during development, rotate
`META_APP_SECRET` and the Meta tokens before going live, and reset the app secret in
the dashboard if it was ever shared/pasted.

---

## 3. Pre-flight (do this once, before touching the dashboard)

- [ ] **Public HTTPS domain** reachable: `https://getnextcall.com` (Meta rejects
      localhost and self-signed certs). `NEXT_PUBLIC_APP_URL` must equal it, **and the
      same value must be pasted into Meta**, because it is the OAuth `redirect_uri` —
      Meta does an exact string match and a mismatch = "URL blocked".
- [ ] **Privacy Policy URL** live: `https://getnextcall.com/privacy`.
- [ ] **Terms URL** live: `https://getnextcall.com/terms`.
- [ ] **Data Deletion instructions + callback URL** live (required to publish). You have
      `/privacy` and `/google-user-data`; add a `/data-deletion` page or point the
      callback at an endpoint that erases the business doc.
- [ ] A **Facebook Page** you administer, and an **Instagram Professional** account
      connected to that Page (needed to test IG).
- [ ] A **Business Portfolio** in business.facebook.com — you must be an Admin on it.
- [ ] Deployed env has `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN`,
      `NEXT_PUBLIC_APP_URL` set (Vercel → Project → Settings → Environment Variables).

Generate a strong verify token (the current one works; random is better):

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## 4. Step-by-step: Meta App Dashboard

### Phase A — Create / confirm the app

1. Go to https://developers.facebook.com/apps → your app (`999451746008588`), or
   **Create App** at https://developers.facebook.com/apps/creation/.
2. If creating: **App name** = `nextCall`, **contact email** = your dev email.
3. **Use cases** — pick the one(s) that give you Messenger *and* Instagram DM:
   - **"Engage with customers on Messenger"** (Messenger Platform), and
   - **"Manage messaging and content on Instagram"** / Instagram Messaging.
   Meta auto-adds required permissions. Use cases **cannot be removed later**, so
   choose deliberately.
4. **Business** — select your Business Portfolio (or create one). This is what makes
   Phase F (Business Verification) possible.
5. Finish → **Go to dashboard**.

### Phase B — App settings (Settings → Basic)

Fill every field; an incomplete Basic Settings panel blocks App Review submission.

| Field | Value |
| --- | --- |
| App Domains | `getnextcall.com` |
| Privacy Policy URL | `https://getnextcall.com/privacy` |
| Terms of Service URL | `https://getnextcall.com/terms` |
| User Data Deletion | Instructions URL `https://getnextcall.com/privacy` (or a callback route) |
| Category | Business & Productivity / Utilities |
| App Icon | 512×512–1024×1024, ≤5 MB, PNG/JPG/GIF |
| Contact Email | a mailbox you actually read |

Then **Settings → Basic → App Secret → Show** and confirm it matches
`META_APP_SECRET`. If unsure, **Reset** it and copy the new value into Vercel.

### Phase C — Add the products

Left nav:

1. **Add Product → Messenger → Set up** — enables the Messenger settings page,
   Webhooks, and the Page Access Token tool.
2. **Messenger → Instagram Settings → Set up** — the Instagram Messaging setup; it lets
   you generate Page access tokens and subscribe the IG topic from the dashboard.
### Phase D — Webhook (Messenger → Settings → Webhooks)

Your app verifies in `GET /api/webhooks/meta/inbound`:
`mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN` → echoes
`hub.challenge`.

1. Callback URL: `https://getnextcall.com/api/webhooks/meta/inbound`
2. Verify Token: the exact value of `META_VERIFY_TOKEN` in Vercel
   (`nextCall@1309680864` today).
3. **Verify and Save** — fires the GET handshake. If it fails:
   - 403 → token mismatch (watch for trailing spaces in the env var).
   - "couldn't be validated" → URL not publicly reachable, deployment still building,
     or `proxy.ts` blocking it (it shouldn't — the matcher whitelists
     `/api/webhooks/*`).
4. **Subscribe to fields** — tick at least:
   - `messages`
   - `messaging_postbacks`
   - `message_reactions` (optional)
   - Under the Instagram section: `messages`, `messaging_postbacks`.
5. **Subscribe your Page** — use Messenger's **Add or Remove Pages** / **Subscribe**
   button and select the Page(s). Requires `pages_manage_metadata` (see bug 2.3 if you
   ever do this via API).

> API equivalent (needs `pages_manage_metadata` in the token):
> `POST https://graph.facebook.com/v19.0/{PAGE_ID}/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token={PAGE_TOKEN}`

### Phase E — Test in Development mode (nothing submitted yet)

While the app is **In Development**, webhooks and the Send API only work for people
with a **role** on the app.

1. **App Roles → Roles** → you as Admin; add testers under **Test Users** / **Roles**.
   Standard Access covers app admins/developers/testers only.
2. Ensure you are Admin/Moderator of the test Page and that the IG account is connected
   to it.
3. In nextCall: sign in as a **Premium** user → Settings → Integrations → **Connect** →
   **Connect Facebook / Instagram** → grant all pages → you come back to
   `/dashboard/settings?focus=integrations&meta_success=true` and the card shows the
   Page name + IG handle.
4. DM the Page (Messenger) from another account that also has a role, and DM the IG
   account. Expect an AI reply.
5. If nothing arrives: check deployment logs for `Invalid Meta Signature` (secret
   mismatch) or `No business found for Page ID` (expected for IG until bug 2.1 is
   fixed).
6. Use **Messenger → Settings → Webhooks → Test** and **Recent deliveries** in the App
   Dashboard to inspect payloads and failures.
### Phase F — Business Verification (hard gate)

Advanced Access requires a verified Business. Standard Access does not, but real
customers are "people without a role", so you must go Advanced.

1. **Business Manager** → https://business.facebook.com → **Business Settings → Security
   Center** (and **Business Info**).
2. **Start Verification**. Provide legal business name, address, phone, website. Meta
   matches official records; if it can't auto-match it asks for documents (business
   licence, utility bill, tax registration, certificate of incorporation).
3. Wait — typically **a few business days** (longer if documents are requested).
4. In the App Dashboard: **Settings → Basic → Verification** should show the app
   connected to a **verified** Business. Only a Business Admin can complete this.

### Phase G — Access Verification (Tech Provider)

This is the step people miss. Because nextCall calls `pages_show_list`,
`pages_read_engagement`, `business_management`, `instagram_basic` on **other
businesses'** assets, the endpoints run a "verification check": if the caller has no
role on your app, the call is **rejected** unless your business is verified as a **Tech
Provider** (error 100, "Unsupported get request…"). Prereqs: Business Verification done
(Phase F) + no restrictions on the business.

1. You'll get a business-admin email when you request Advanced Access; you can also open
   it at **App Dashboard → Basics → Verifications → Access verification**.
2. Categorise the business and describe how it uses other businesses' data to provide a
   service to them. Plain-English version you can use:

   > nextCall is a SaaS platform. A business signs in and connects its own Facebook
   > Page and Instagram Professional account so that an AI assistant can read and reply
   > to direct messages on that business's behalf. We store a Page access token per
   > tenant, use it only to send/read messages for that same tenant, and never share
   > tenant data with third parties. Permissions requested (`pages_show_list`,
   > `pages_messaging`, `pages_read_engagement`, `instagram_basic`,
   > `instagram_manage_messages`, `business_management`) are required to let the tenant
   > select their asset and answer messages. We delete the token when the tenant
   > disconnects.

3. Decision in **~5 days**. Approved → verified Tech Provider; any app your business
   claims passes the check. Businesses already verified don't re-verify (but can lose it
   if the business goes unverified, the app is disconnected, or the business is
   restricted).
### Phase H — App Review (the permissions)

Submit only what you use. Your scope list maps to:

| Permission | Why nextCall needs it | Access level |
| --- | --- | --- |
| `pages_show_list` | list the user's Pages in the OAuth callback | Advanced |
| `pages_messaging` | read/reply to Page DMs via Send API | Advanced |
| `pages_read_engagement` | read Page data (name/picture) | Advanced |
| `pages_manage_metadata` | subscribe Page to webhooks (add if you subscribe via API) | Advanced |
| `instagram_basic` | resolve the linked IG account | Advanced |
| `instagram_manage_messages` | read/reply to IG DMs | Advanced |
| `business_management` | dependency for the page/IG perms | Advanced |

Steps:

1. **Review → App Review → Requests → Request Permissions or Features**.
2. **Complete App Settings** first (Phase B) — review is locked until Basic Settings is
   complete.
3. Pick the matching guide: nextCall processes messages **on behalf of other
   businesses**, so submit as **Apps For Other Businesses**.
4. **Platform settings:** set **Website** to `https://getnextcall.com`.
5. **Credentials:** if you use Facebook Login for Business, select that; otherwise give
   reviewers a **test account** login + password (never personal FB/IG credentials).
6. **Step-by-step instructions** (adapt this template):
   1. Go to `https://getnextcall.com` and log in with the test credentials.
   2. Reach the **Premium** plan (Meta DMs are Premium-gated) — provide a test account
      already on Premium.
   3. Open **Dashboard → Settings → Integrations**.
   4. Click **Connect** next to *Facebook & Instagram*, then **Continue with Facebook**
      and grant the requested permissions for the Page + IG account.
   5. Send a message to the Page in Messenger and to the IG account in Instagram; an AI
      reply arrives within seconds. Show a low-confidence question escalating.
7. **Screen recording** (required): login → grant permissions → connected state →
   test DM → AI reply. Record the same app you submit; mismatches are auto-rejections.
8. **Per permission** descriptions:
   - `business_management` → state it is a **dependency** for `pages_messaging`,
     `pages_show_list`, and `instagram_manage_messages`, and show the Page admin
     explicitly granting the app access to their business assets in the recording.
   - `instagram_manage_messages` → describe how a DM is answered, how an agent can
     read/reply manually (if you have a custom inbox), and how unsent messages are
     handled. If there is no human inbox, say so plainly.
9. Tick the usage-agreement checkboxes, remove any unused permission, **Submit for
   Review**. Respond promptly to reviewer questions.

### Phase I — Data Use Checkup (annual)

Once live, **App Dashboard → Review → Data Use Checkup** must be completed **once per
year** for verification. Missing it risks enforcement/disabled access — set a reminder.

### Phase J — Go Live

1. **Publish / App Mode → Live** (left nav **Publish**).
2. Confirm the checklist is green: icon, privacy policy, data deletion URL, contact
   info, verified business, Tech Provider verification, review approved.
3. Switch to Live. Now users **without** a role can grant permissions and webhooks flow
   for their Pages/IG accounts.

### Phase K — Post-launch

- Fix the Instagram matching bug (2.1) and add `pages_manage_metadata` + token refresh
  (2.3/2.4).
- Monitor **Webhooks → Recent deliveries** and app logs; alert on signature failures and
  `No business found for Page ID`.
- Rotate `META_APP_SECRET` if it was ever exposed, then update Vercel + redeploy.
- Re-run the smoke test after every app-secret or env change.

---

## 5. Quick reference — values for this app

| Dashboard field | Value |
| --- | --- |
| App ID | `999451746008588` |
| Webhook Callback URL | `https://getnextcall.com/api/webhooks/meta/inbound` |
| Verify Token | value of `META_VERIFY_TOKEN` (`nextCall@1309680864`) |
| OAuth Redirect URI | `https://getnextcall.com/api/integrations/meta/callback` |
| Login dialog | `https://www.facebook.com/v19.0/dialog/oauth` |
| Graph API version | `v19.0` (used throughout `callback` + `inbound` routes) |
| Deauthorize/Data-deletion | optional; `/privacy` for now |

> Graph API `v19.0` is old. It still works, but plan a bump to a current version before
> it is retired — changing it means touching the hardcoded `v19.0` strings in
> `auth`/`callback`/`inbound` (and the OAuth dialog URL).
---

## 6. Standard fixes for the bugs in §2

These are the industry-standard patterns (not one-off hacks). Each entry gives the
root cause, the accepted solution, and the concrete change for this repo.

### Fix 1 — Instagram DM routing (bug 2.1)

**Root cause:** the handler assumes every event's `recipient.id` is a Page ID. For
Instagram, `recipient.id` is the **Instagram Professional Account ID**, so the lookup
against `meta_page_id` never matches.

**Standard solution:** make the webhook *platform-aware* and resolve the tenant by the
asset that actually sent the event.

1. Derive the channel from `body.object` (`page` → `messenger`, `instagram` →
   `instagram`).
2. Match the tenant against **either** stored asset id.
3. Carry the channel down into `handleMessage` so the conversation key and logs are
   unambiguous.

```ts
type MetaChannel = "messenger" | "instagram";

const assetId = event.recipient.id; // Page ID (messenger) OR IG account ID (instagram)

const business = connectedBusinesses.find((b) =>
  channel === "instagram"
    ? String(b.meta_ig_business_id) === assetId
    : String(b.meta_page_id) === assetId
);
```

The **send** side needs no change: Meta documents Instagram replies as
`POST /me/messages?access_token=<PAGE_ACCESS_TOKEN>` with `recipient.id = IGSID`, which
is exactly what the code already does — so the Page token in
`meta_page_access_token` works for both channels.

**Also namespace the conversation key** by channel so a Messenger PSID and an IG SID
can never collide:

```ts
const conversationKey = { sender_id: senderId, page_id: assetId, channel };
```

(Add `channel` to the `conversations` docs; keep `page_id` as the asset id for
back-compat.)
---

### Fix 2 — Multiple Pages (bug 2.2)

**Root cause:** `callback/route.ts` takes `pagesData.data[0]` and persists it with no
choice.

**Standard solution:** a **two-step OAuth with an asset picker** — exactly how Meta's
own onboarding tools behave.

1. In the callback, collect **all** pages into a pending selection (short-lived):
   store `{ id, name, picture, igId, igName }` (metadata only, **no tokens**) against
   the Clerk `userId` with a 10-minute TTL.
2. If exactly one Page → persist it immediately (current behavior, zero friction).
3. If more than one → redirect to a picker:
   `/dashboard/settings?focus=integrations&meta_select=1`.
4. A `POST /api/integrations/meta/select-page` re-fetches the chosen page's token using
   the stored pending user token and persists the chosen asset.

Persist the **metadata** for every page in a `meta_pages` array so users can switch
later without re-doing OAuth; store the **access token only for the selected page**
(tokens are credentials — don't fan them out across every asset).

```ts
// on the business doc
meta_pages: [{ id, name, picture, ig_id, ig_name }],  // metadata only
meta_selected_page_id: string,
meta_page_access_token: string | null,                 // selected page only
meta_page_id / meta_ig_business_id                     // derived from selected
```
---

### Fix 3 — Missing permissions + programmatic subscription (bug 2.3)

**Root cause:** the scope list omits `pages_manage_metadata` and `instagram_basic`.

- `pages_manage_metadata` — required to subscribe a Page to webhooks
  (`POST /{page-id}/subscribed_apps`) and listed as **required** for the "Engage with
  customers on Messenger" use case.
- `instagram_basic` — required to read `instagram_business_account` when resolving the
  linked IG account.

**Standard solution:** add both to `auth/route.ts`, and **subscribe the Page from the
callback** instead of relying on a manual dashboard click per tenant (which does not
scale and is the #1 cause of "works for me, not for my customer").

```ts
const scopes = [
  "pages_show_list",
  "pages_messaging",
  "pages_read_engagement",
  "pages_manage_metadata",     // NEW — subscribe Page to webhooks
  "instagram_basic",           // NEW — read linked IG account
  "instagram_manage_messages",
  "business_management",
].join(",");
```

```ts
// in callback, right after obtaining pageAccessToken + pageId
await fetch(
  `https://graph.facebook.com/v19.0/${pageId}/subscribed_apps` +
    `?subscribed_fields=messages,messaging_postbacks` +
    `&access_token=${pageAccessToken}`,
  { method: "POST" }
);
```

> Order matters: the permission must be added to the app's **use case** in the
> dashboard *before* you request it in the login dialog, or the dialog returns
> "Invalid Scopes".
---

### Fix 4 — Token lifecycle (bug 2.4)

**Root cause:** only the Page token is stored, with no expiry and no recovery. Meta
long-lived tokens last **~60 days** and, per Meta's own docs, "Do not depend on these
lifetimes remaining the same."

**Standard solution** — three parts:

1. **Store what you need to refresh.** Capture `expires_in` from the
   `fb_exchange_token` response and save the long-lived **user** token alongside the
   Page token:

   ```ts
   meta_token_expires_at: new Date(Date.now() + longLivedData.expires_in * 1000).toISOString(),
   meta_user_access_token: longLivedToken,   // needed to re-derive the Page token
   ```

2. **Refresh on a schedule.** Add a cron under the existing `/api/cron/*` (already
   public in `proxy.ts`) that, for any business expiring within ~7 days, re-exchanges
   the user token (`grant_type=fb_exchange_token`), re-runs `/me/accounts`, and
   re-writes the Page token + expiry.

3. **Handle invalidation.** A send that returns OAuth error code **190** should mark
   the tenant `meta_needs_reconnect: true`, raise a notification, and stop retrying —
   never crash the webhook. Add the dashboard **Deauthorize Callback URL**
   (`/api/integrations/meta/deauthorize`) so tokens are cleared when a user removes the
   app, plus a **Data Deletion** callback for GDPR.

> Server-to-server alternative: a **System User** token in the Business portfolio never
> expires on time. That is the standard for *first-party* automation, but it cannot
> replace per-tenant OAuth when customers each connect their own Page.
---

### Fix 5 — Respond to Meta within 5s (bug 2.5)

**Root cause:** the handler `await`s a 3-second human buffer **and** an OpenAI call
*before* returning 200, so a slow model blows Meta's ~5-second budget and triggers
retries.

**Standard solution:** acknowledge first, work after — Next.js ships `after()` for
exactly this (confirmed exported from `next/server` in this version,
`node_modules/next/dist/server/after/after.d.ts`).

```ts
import { after, NextResponse } from "next/server";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyMetaSignature(request, rawBody)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const channel: MetaChannel = body.object === "instagram" ? "instagram" : "messenger";

  if (body.object === "page" || body.object === "instagram") {
    for (const entry of body.entry) {
      for (const event of entry.messaging ?? []) {
        if (!event.message || event.message.is_echo) continue;

        // Deterministic idempotency key — `mid` is the stable message id.
        const eventKey = `meta:${channel}:${event.message.mid ?? `${event.sender.id}:${event.timestamp}`}`;

        after(async () => {
          // The insert IS the lock: a duplicate `_id` throws, so concurrent
          // deliveries cannot both process (fixes the findOne→insertOne race).
          try {
            await webhookEventsCollection.insertOne({
              _id: eventKey, provider: "meta", event_id: eventKey,
              created_at: new Date().toISOString(),
            });
          } catch {
            return; // already handled
          }
          await handleMessage(event, channel);
        });
      }
    }
  }

  return NextResponse.json({ status: "ok" }, { status: 200 }); // immediate ack
}
```

Notes:

- Replace the `findOne`-then-`insertOne` dedupe with a **relied-upon unique `_id`** —
  the check-then-act pattern has a TOCTOU race under Meta's rapid retries.
- Never fall back to `Date.now()` for an idempotency key (non-deterministic =
  duplicate processing). Use `mid`, else sender+timestamp.
- `after()` work must finish within the platform's function max duration. If the 3s
  buffer + LLM call risks that, move the delay into a queue instead of `setTimeout`.
---

### Fix 6 — Harden the handshake (small)

`GET` compares the verify token with `===`. Swap in your existing constant-time helper
for consistency with the rest of the codebase:

```ts
import { hasValidSecret } from "@/lib/security";
if (mode === "subscribe" && hasValidSecret(token, process.env.META_VERIFY_TOKEN)) {
  return new NextResponse(challenge, { status: 200 });
}
```

---

### Priority order

| # | Fix | Effort | Why |
| --- | --- | --- | --- |
| 1 | Instagram routing (Fix 1) | S | IG is advertised as working; it isn't |
| 2 | Permissions + subscription (Fix 3) | S | Nothing multi-tenant works without it |
| 3 | Immediate 200 / dedupe (Fix 5) | S | Prevents dropped + duplicated replies |
| 4 | Token lifecycle (Fix 4) | M | Silent tenant outages at ~day 60 |
| 5 | Page picker (Fix 2) | M | Only bites multi-Page tenants |
| 6 | Handshake hardening (Fix 6) | XS | Cheap hygiene |