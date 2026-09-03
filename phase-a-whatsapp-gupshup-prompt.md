# AutoNexa — Phase: WhatsApp Notifications via Gupshup (Phase A)

## Context

AutoNexa is a multi-tenant NestJS modular monolith (Prisma + PostgreSQL). It already has a `NotificationsModule` with existing Email/SMS provider(s) dispatching through a shared `Notification` entity. We are adding WhatsApp as a new notification channel via Gupshup's WhatsApp Business API.

This phase covers **two trigger points only**:
1. Estimate approval (magic link) — sent via WhatsApp when an estimate transitions to `SENT`
2. Service-due / insurance reminders — sent via WhatsApp from the existing reminder cron job

Appointment confirmations, invoice/payment links, and job-ready notifications are **out of scope** for this phase (Phase B).

## Preserve these existing architectural patterns

- All data access via `this.prisma.forTenant()` — never the raw Prisma client
- Every `create()` call cast with `as unknown as Prisma.<Model>UncheckedCreateInput`
- Any new tenant-owned model must be added to `TENANT_SCOPED_MODELS` in `prisma.service.ts`
- Money fields use `Prisma.Decimal` (not applicable here, but don't introduce floats anywhere)
- Status fields use Prisma enums
- Business-rule decision logic extracted into pure, unit-testable functions (mirror the style of `estimate-totals.ts`, `job-card-status-transitions.ts`, `gst-split.ts`)
- Notification creation must happen inside the same DB transaction as the status change it responds to
- No secrets hardcoded — all Gupshup config comes from environment variables via the existing config module pattern

## 1. Config

Add to the config module (same pattern as existing Razorpay config):

```
GUPSHUP_API_KEY=
GUPSHUP_APP_NAME=AutoNexa
GUPSHUP_APP_ID=
GUPSHUP_SOURCE_NUMBER=
GUPSHUP_WEBHOOK_SECRET=   # shared secret to validate inbound webhook calls
```

Validate these at boot (fail fast if missing, consistent with existing boot-safety checks from the production hardening phase) — but only require them if `WHATSAPP_ENABLED=true`, so environments without Gupshup credentials configured don't crash on startup.

## 2. Schema changes

Add to `Customer` model:
- `whatsappNumber String?` — E.164 format, nullable
- `whatsappOptIn Boolean @default(false)` — explicit consent flag, must be true before any WhatsApp send is attempted

Extend the existing `Notification` model (do not create a parallel table):
- `channel` enum gains a `WHATSAPP` value (extend existing `NotificationChannel` enum if present, or create one if notifications aren't already channel-typed)
- Add `providerMessageId String?` — Gupshup's message ID, used to reconcile delivery webhooks
- Add `providerStatus String?` — raw status string from Gupshup (`sent`/`delivered`/`read`/`failed`), separate from your existing internal `Notification.status` enum so you don't have to force Gupshup's vocabulary into your own state machine

Write the migration. Add `Notification` and `Customer` field changes to any relevant tenant-scoping checks if not already covered (Notification should already be tenant-scoped; confirm and don't duplicate the entry in `TENANT_SCOPED_MODELS` if it's already there).

## 3. Gupshup client

Create `src/modules/notifications/whatsapp/gupshup.client.ts`:

- Thin HTTP wrapper around Gupshup's template message send endpoint (`POST /wa/api/v1/template/msg`, form-encoded per their API — confirm exact content-type and param names against current Gupshup docs since their API has had versioned changes)
- Method: `sendTemplateMessage(destination: string, templateId: string, params: string[]): Promise<{ messageId: string }>`
- Use `GUPSHUP_SOURCE_NUMBER` and `GUPSHUP_APP_NAME` as configured
- Auth via `apikey` header using `GUPSHUP_API_KEY`
- On non-2xx response, throw a typed `WhatsAppSendException` with the provider's error body attached (don't swallow provider error detail — needed for debugging template mismatches)
- No retry logic in this client itself — retries belong in the caller/queue layer if you have one, or a simple bounded retry in the provider (see below), not in the raw HTTP client

Write unit tests mocking the HTTP layer — cover success, non-2xx failure, and malformed response body.

## 4. WhatsApp provider

Create `src/modules/notifications/providers/whatsapp.provider.ts`, implementing whatever interface your existing `EmailProvider`/`SMSProvider` already conform to (inspect the existing providers first and match the interface exactly — do not introduce a divergent shape).

Responsibilities:
- Look up `Customer.whatsappOptIn` and `Customer.whatsappNumber` before attempting a send — if opt-in is false or number is missing, skip silently and log at debug level (this is a normal, expected path, not an error)
- Map internal notification type (`ESTIMATE_READY`, `SERVICE_DUE_REMINDER`, `INSURANCE_REMINDER`) to the corresponding Gupshup template ID — use a small lookup map/const, not inline conditionals scattered through the method
- Build the params array per template from the notification's payload data
- Call `GupshupClient.sendTemplateMessage`
- On success, persist `providerMessageId` on the `Notification` record within the same transaction as the notification's creation/status update
- On failure, do not throw uncaught — catch, log, and mark `Notification.status` as `FAILED` (or your existing equivalent), so a WhatsApp failure never blocks the estimate/reminder flow it's attached to. WhatsApp send failure must be non-fatal to the surrounding business transaction.

## 5. Wire into existing trigger points

**Estimate approval:**
Find wherever the `DRAFT → SENT` transition currently fires the existing email/SMS notification (this endpoint already exists — it was the one previously missing and fixed). Add a WhatsApp send alongside, gated on `whatsappOptIn`. Keep the magic link content in the WhatsApp template — this reuses the existing magic-link generation logic already built, just changes the delivery channel.

**Reminder cron job:**
Find the existing service-due / insurance reminder job. Add WhatsApp as an additional dispatch channel per customer, same opt-in gating, reusing whatever reminder-window/eligibility logic already determines who gets reminded — do not duplicate that eligibility logic, just add a channel to the existing dispatch step.

In both cases: **do not remove or change the existing email/SMS dispatch.** WhatsApp is additive. If a tenant/customer has no WhatsApp opt-in, existing channels continue exactly as before.

## 6. Inbound webhook

Create `src/modules/notifications/whatsapp/whatsapp-webhook.controller.ts`:

```
POST /webhooks/gupshup
```

- Validate the request using `GUPSHUP_WEBHOOK_SECRET` (check Gupshup's docs for their actual signature/secret mechanism — implement whatever they support; if they only support an unauthenticated URL, add an IP allowlist or a secret path segment as a mitigation and note this as a known limitation)
- Parse delivery status events (`sent`/`delivered`/`read`/`failed`) and update the matching `Notification.providerStatus` by looking up `providerMessageId`
- Return 200 quickly — don't do heavy processing synchronously; if there's any risk of slow downstream work, just persist the raw event and return, process async
- Log and discard (don't error) on webhook events for message IDs that don't match any `Notification` — this will happen for test/sandbox traffic and shouldn't 500

No inbound reply parsing/routing in this phase — just delivery receipts. Note in a code comment that inbound reply handling (e.g., customer replying to approve an estimate) is deferred to Phase C.

## 7. Testing checklist for this phase

- Unit tests: `GupshupClient` (mocked HTTP), `WhatsAppProvider` (mocked client, cover opt-in/opt-out paths, cover send failure not throwing)
- Integration: confirm estimate `DRAFT → SENT` transition still succeeds end-to-end even if `WhatsAppProvider` throws internally (non-fatal requirement above)
- Integration: webhook endpoint updates `Notification.providerStatus` correctly given a synthetic Gupshup payload; confirm it 200s and no-ops on unmatched message IDs
- `tsc --noEmit` and `npx jest` clean, as usual

## 8. Explicitly out of scope for this prompt

- Appointment confirmation, invoice/payment link, job-ready WhatsApp sends (Phase B)
- Inbound reply parsing / WhatsApp-based estimate approval via text reply (Phase C)
- Retry/queue infrastructure beyond what's described above
- UI for capturing `whatsappOptIn` at customer intake (frontend work, separate prompt)

---

Before writing code: confirm the current shape of the existing `EmailProvider`/`SMSProvider` interface and the existing `Notification` model/enum by reading the relevant files first, and flag back any mismatch between what's described above and what actually exists, rather than guessing.
