# AI Providers

NextCall routes **all** backend AI through one shared client: `lib/ai/client.ts`
(`chatCompletion`). Providers are tried in the order they are declared, so a
provider that runs out of credit (or is briefly unavailable) automatically hands
over to the next one.

Live voice (Retell) is a **separate** stack and is deliberately not part of this
chain.

## Provider chain

| Order | Provider | Endpoint | Notes |
|-------|----------|----------|-------|
| 1 | OpenAI (primary) | `https://api.openai.com/v1` | default |
| 2 | Google Gemini (fallback) | `https://generativelanguage.googleapis.com/v1beta/openai/` | OpenAI-compatible endpoint |
| 3+ | any future provider | derived from `TYPE` | add numbered env slots, no code change |

Supported `TYPE` values today: `openai`, `gemini`.

## Environment variables

```env
# Provider 1 — PRIMARY (OpenAI)
AI_PROVIDER_1_TYPE=openai
AI_PROVIDER_1_API_KEY=            # falls back to OPENAI_API_KEY when blank
AI_PROVIDER_1_MODEL=gpt-6-luna

# Provider 2 — FALLBACK (Google Gemini)
AI_PROVIDER_2_TYPE=gemini
AI_PROVIDER_2_API_KEY=            # your key from Google AI Studio
AI_PROVIDER_2_MODEL=gemini-3.8-flash

# Add more providers any time: AI_PROVIDER_3_TYPE / _API_KEY / _MODEL …
```

Rules enforced by `lib/ai/config.ts`:

* The **first missing `_TYPE`** ends the list (a numbering gap stops the scan).
* The endpoint is **derived from `TYPE`** — never guessed, never hardcoded per model.
* **Placeholders are ignored** (`PASTE_MY_…`, `YOUR_…`, `PLACEHOLDER`, `none`, …),
  so the app keeps running on the providers that *are* configured.
* A slot missing its key or model is skipped with a one-time warning.
* Model IDs are **always configurable**. They must be verified in the provider's
  own docs — a model name shown in one product's UI is not necessarily a valid
  API model id.

### Backward compatibility

If **no** `AI_PROVIDER_*` slots exist, the legacy `OPENAI_API_KEY` (plus optional
`OPENAI_MODEL`, default `gpt-4o-mini`) is used as provider 1. Existing
deployments keep working untouched.

## When does it fail over?

The decision lives in `lib/ai/classify.ts`:

| Situation | Detected by | Action |
|-----------|-------------|--------|
| **Quota / billing exhausted** | `429` **with** `insufficient_quota` / `billing_hard_limit_reached`, or explicit quota/billing language | **Fail over** — no retry on an exhausted account |
| **Rate limit** | `429` *without* a quota signal | **Retry once** on the same provider, then fail over |
| **Transient server/network** | `5xx`, `APIConnectionError`, `ECONNRESET`, timeouts | **Retry once**, then fail over |
| **Bad credentials** | `401`, `invalid_api_key` | **Fail over** — never retry the same key |
| **Forbidden / not permitted** | `403` | **Fail over** |
| **Unknown model** | `404`, `model_not_found` | **Fail over** + visible in logs |
| **Malformed request / unsupported feature** | `400`, `422`, `invalid_request_error`, context-length | **FAIL FAST** — a bug is never masked by the fallback |
| **Safety refusal** | `content_filter` / `content_policy_violation`, or `finish_reason = content_filter` | **FAIL FAST** — never re-sent to another provider |
| **Anything unknown** | — | **FAIL FAST** into the recovery engine |

> A plain `429` is **not** treated as "out of credits". Only an explicit
> quota/billing signal counts as exhaustion.

**Bounded by design.** At most `providers × (1 + 1)` requests. The OpenAI SDK's
own retries are disabled (`maxRetries: 0`) so the attempt count is ours and
observable. When every provider fails, `chatCompletion` throws
`AiProvidersUnavailableError` — a controlled application-level error.

**Observability.** Every transition logs one redacted JSON line:

```
[ai] {"event":"ai_call_failed","providerId":"provider-1","providerType":"openai","category":"QUOTA_EXHAUSTED","reason":"quota_exhausted","failover":true,"retry":false,"attempt":1,"lastProvider":false,"message":"…","ts":"…"}
```

Credentials can never reach the logs — error text is passed through
`lib/recovery/redaction.ts`.

## Model-specific parameter handling

Not every provider (or model) accepts every parameter — and because an
unsupported parameter returns HTTP `400`, which we deliberately **fail fast** on,
a leftover OpenAI-only knob could break the chain instead of failing over. So
`lib/ai/client.ts` adapts the request body per provider before sending it.

**OpenAI reasoning-model families** (`gpt-6*`, `gpt-5*`, `gpt-4.1*`, `o1*`,
`o3*`, `o4*`) — e.g. `gpt-6-luna` — get:

| Adjustment | Why |
|---|---|
| `temperature` / `top_p` removed | reasoning models only support the default sampling temperature |
| `max_tokens` → `max_completion_tokens` | the legacy name is rejected on reasoning models |
| `reasoning_effort: "none"` injected **when `tools` are present** | OpenAI's docs: Chat Completions supports function calling on these models *only* with `reasoning_effort: "none"` |

Non-reasoning OpenAI models (e.g. `gpt-4o-mini`) are passed through unchanged.

**Non-OpenAI providers** (Gemini) have OpenAI-only keys stripped
(`reasoning_effort`, `store`, `max_completion_tokens`, `seed`, `logprobs`,
`top_logprobs`) so the fallback is never rejected with a 400 for a parameter it
doesn't understand. Gemini still receives `temperature` / `max_tokens`, which it
does support.

> **Latency/cost note:** `gpt-6-luna` is a reasoning model and defaults to
> `reasoning.effort = medium`. For latency-sensitive paths (the Meta/Instagram DM
> reply runs inside Next's `after()` against Meta's ~5s budget) you may want to
> lower the effort. Chat Completions accepts a `reasoning_effort` parameter if you
> want to set it explicitly.

## Multi-step tool calls (SMS / WhatsApp)

The SMS assistant (`lib/sms-chat.ts`) can call tools (`book_appointment`,
`confirm_appointment`, `reschedule_appointment`, `cancel_appointment`) across
several model turns. Two guarantees apply:

1. **One provider per interaction.** The provider that serves the first turn is
   **pinned** for the remaining turns, so a transient failure never switches
   providers mid-conversation and never replays a side effect.
2. **A tool executes at most once.** Tool calls are de-duplicated by
   `tool_call.id`, and bookings use a **deterministic idempotency key**
   (`sha256(business + customer + slot + summary)`), so a retried or
   concurrently delivered webhook cannot create a second appointment. The write
   reconciles first: if that exact booking already exists, it reports it as
   already booked instead of inserting again.

## Inbound SMS deduplication

`app/api/webhooks/twilio/sms-inbound/route.ts` claims Twilio's stable
`MessageSid` through `claimWebhookEventOnce()` (in `lib/astra.ts`) **before** any
work happens:

* The claim is a single insert against a unique `_id` — **atomic** and safe under
  concurrent/duplicate deliveries (unlike a find-then-insert race).
* A duplicate returns the empty TwiML response and stops; no duplicate reply, no
  duplicate booking.
* If the storage layer errors for an unrecognised reason the guard **fails open**
  (the message is processed) rather than silently dropping a customer message.

No migration is needed: it reuses the existing `webhook_events` collection, and
the in-memory fallback enforces the same unique-`_id` rule.

## Health endpoint

`GET /api/health` reports whether **at least one** AI provider is configured.
It never makes a model call and never returns a key.

* Public callers: `{ status, timestamp }` only.
* Trusted callers (holding `CRON_SECRET` as a Bearer token): adds `checks` and
  `ai: { configured, providers: [{ id, type, model }] }`.

> `configured: true` means **credentials are present**. It is **not** proof of
> connectivity. A real provider round-trip is only exercised by live traffic.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `[ai/config] No AI providers configured` | no slots and no `OPENAI_API_KEY` | set `AI_PROVIDER_1_*` or `OPENAI_API_KEY` |
| `provider "provider-2" is not active` | key still a placeholder / missing / no model | paste the real key, set `AI_PROVIDER_2_MODEL` |
| `All N configured AI provider(s) failed` | every provider exhausted or invalid | check logs for `[ai] ai_call_failed` categories |
| Fallback never triggers | primary returns `400` or a safety refusal | by design — those fail fast |
| Gemini JSON mode behaves oddly | the compat layer is beta | verify with a smoke test; try another model |
| Health `degraded` | a required env var is missing | see `checks` in the trusted response |

## Adding another provider

1. Add `AI_PROVIDER_3_TYPE`, `AI_PROVIDER_3_API_KEY`, `AI_PROVIDER_3_MODEL`.
2. If `TYPE` isn't `openai`/`gemini`, add its base URL to `PROVIDER_BASE_URLS`
   in `lib/ai/config.ts` and its name to `AiProviderType`.

No other code changes are required.

## Tests

`tests/ai-providers.test.ts` mocks the OpenAI SDK — no network calls, no real
SMS, no real appointments. It covers provider ordering, the legacy env bridge,
every failure category, bounded retries, fallback on quota exhaustion, fail-fast
on bad requests, provider pinning, tool-loop de-duplication, booking
idempotency and webhook dedupe.

```bash
npm test
```
