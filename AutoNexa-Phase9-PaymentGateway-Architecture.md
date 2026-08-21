# AutoNexa — Payment Gateway (Razorpay) Architecture

> Scope: architecture only, per instruction. No application code included yet.
> Scoped to one feature, layered onto the existing Phase 1–8 system — this
> document assumes and cross-references the conventions already established
> in the codebase (`PrismaService.forTenant()`, `TENANT_SCOPED_MODELS`,
> `resource:action` permissions, `MessagingService`), not a general
> restatement of them.

---

## 1. Goal & Non-Goals

**Goal:** let a customer pay an invoice online (Razorpay Payment Link), with
the payment reflected on the invoice automatically once Razorpay confirms
it — no staff action required to record it.

**Non-goals for this phase:**
- Replacing manual payment recording (`POST /invoices/:id/payments`) — it
  keeps working exactly as today, unmodified.
- Refunds through the gateway (Razorpay supports it; out of scope here —
  `InvoiceStatus.REFUNDED` already exists but nothing currently sets it,
  gateway or manual).
- Recurring/subscription billing, saved cards, or a customer-facing payment
  page hosted by AutoNexa itself — Razorpay's own hosted Payment Link page
  handles the actual card/UPI entry; this system never touches card data.
- Multiple payment gateway providers — the schema leaves room for it
  (`provider` field), but only Razorpay is implemented.

---

## 2. How This Maps Onto the Existing Invoice/Payment Model

### 2.1 The core tension

`InvoicesService.recalculateStatus()` computes `Invoice.status` by summing
**every** `Payment` row against the invoice and running that sum through
`rollupPaymentStatus()` (`common/billing/rollup-payment-status.ts`) — the
established rule in this codebase is *status is always recomputed from
source data, never stored as its own source of truth* (same discipline as
`JobCard.status` and `Estimate` totals).

A gateway payment has a lifecycle a manual payment doesn't: a Payment Link
can be created and never paid, paid and later fail webhook delivery, or be
double-delivered by Razorpay's retry policy. If a `Payment` row is
created the moment a Payment Link is generated (order created, no money
moved yet), it would be summed into "amount paid" immediately and the
invoice would show as paid before the customer has done anything.

### 2.2 Decision: create the `Payment` row at capture, not at link creation

- Generating a Payment Link does **not** create a `Payment` row. It creates
  a Razorpay Order and returns the link — nothing invoice-affecting happens
  yet.
- A `Payment` row is created only when Razorpay's webhook confirms
  `payment.captured` — at that point it's the same kind of fact a manual
  payment row already represents ("this much money has actually arrived"),
  so it can go through the *exact same* `recalculateStatus()` path.
- This means `recalculateStatus()`'s summation query needs **zero
  changes** — every `Payment` row it ever sees already represents captured
  money, gateway or manual. This is the main reason to prefer this over
  the alternative below.

**Alternative considered:** create the `Payment` row at order-creation time
with a `gatewayStatus: 'CREATED'` field, and teach `recalculateStatus()` to
filter to `gatewayStatus IN (null, 'CAPTURED')`. Rejected because it means
touching a function that's currently a clean, well-tested, order-agnostic
rollup — and "manual payment recording must keep working unchanged" is
easiest to guarantee by not touching the code manual payments run through
at all. The order/link state (created → paid → expired/cancelled) is
tracked in the new `PaymentGatewayEvent` table instead (§2.4), which has no
bearing on `Invoice.status` until a `payment.captured` event lands.

### 2.3 `Payment` model extension

```prisma
model Payment {
  id              String   @id @default(uuid())
  tenantId        String
  invoiceId       String
  invoice         Invoice  @relation(fields: [invoiceId], references: [id])
  amount          Decimal  @db.Decimal(12, 2)
  paymentDate     DateTime @default(now())
  method          String   // "cash" | "upi" | "card" | "bank_transfer" | "credit" | "razorpay"
  referenceNumber String?
  createdAt       DateTime @default(now())

  // Gateway fields — all null for a manual payment (the existing, unchanged
  // path). Populated only when method = "razorpay".
  provider          String? // "razorpay" — free string, not an enum, matching
                             // `method`'s own precedent, so a second provider
                             // later doesn't need a migration.
  providerOrderId   String? // Razorpay Order id ("order_...")
  providerPaymentId String? // Razorpay Payment id ("pay_..."), set once captured
  providerSignature String? // The signature Razorpay sent on this event — kept
                             // for audit/dispute reference, never re-verified
                             // from storage (verification happens once, at
                             // receipt time, against the raw webhook body).

  @@index([tenantId, invoiceId])
  @@index([providerOrderId])   // webhook reconciliation lookup, see §3
  @@map("payments")
}
```

`method: 'razorpay'` is added to `CreateInvoicePaymentDto`'s existing
`@IsIn([...])` list conceptually, but in practice a gateway `Payment` is
never created by that DTO/endpoint at all (§2.2) — the allowed-values list
only needs it so the value round-trips cleanly through read endpoints and
the frontend's `PaymentMethod` type/label maps (`METHOD_LABEL` on the
invoice detail page) without an `'razorpay'` case falling through to
"unknown".

### 2.4 New table: `PaymentGatewayEvent`

Raw webhook audit trail — every webhook delivery Razorpay makes, verified
or not, processed or not:

```prisma
model PaymentGatewayEvent {
  id              String   @id @default(uuid())
  tenantId        String?  // null until resolved (see §3) — a signature
                            // failure or an event for an unrecognized order
                            // never learns a tenant
  provider        String   @default("razorpay")
  eventId         String   // Razorpay's own event id (`X-Razorpay-Event-Id` /
                            // payload.id) — the idempotency key, see §3.3
  eventType       String   // "payment.captured" | "payment.failed" |
                            // "payment_link.paid" | "payment_link.expired" | …
  providerOrderId String?
  signatureValid  Boolean
  processedAt     DateTime? // null = received but not yet applied (or
                             // rejected — see `processingError`)
  processingError String?
  rawPayload      Json
  createdAt       DateTime @default(now())

  @@unique([provider, eventId])   // idempotency — see §3.3
  @@index([tenantId, createdAt])
  @@index([providerOrderId])
}
```

This is deliberately **not** in `TENANT_SCOPED_MODELS`
(`prisma/prisma.service.ts`) — a webhook has no tenant context until the
handler resolves one mid-request (§3), so this table is always written
through `prisma.platform`, the same "no request context" precedent
`ReminderCronService` and `MessagingService.log()` already use. `tenantId`
is genuinely nullable here (unlike every other table in
`TENANT_SCOPED_MODELS`), which is exactly why it can't be tenant-scoped by
the standard mechanism.

This table is also the answer to "how do gateway payments show up in the
audit trail" — the normal `AuditLogInterceptor` silently no-ops on this
route (§4.3), so this table *is* the audit record for gateway activity,
parallel to (not a replacement for) `AuditLog`.

---

## 3. Webhook Handling

### 3.1 Endpoint

`POST /payments/webhooks/razorpay` — new `PaymentsGatewayModule`, not
nested under `invoices/` (Razorpay sends one webhook stream per merchant
account, not per invoice; the handler resolves which invoice/tenant a given
event belongs to, not the other way around).

`@Public()` (bypasses `JwtAuthGuard`) — Razorpay calls this directly, no
JWT exists. This also means the global `TenantContextInterceptor`
(`common/interceptors/tenant-context.interceptor.ts`) passes through
untouched (it only establishes `TenantContext` when `request.user` is
set), so `PrismaService.forTenant()` is **unusable** for the first part of
this handler — same situation `ReminderCronService` already solves by
using `prisma.platform` directly (§3.2).

Authenticity is established by **signature verification**, not JWT — see
§3.4.

### 3.2 Reconciliation: finding the tenant with no tenant context

Sequence:

1. Read the raw request body (needs `rawBody: true` on this route specifically
   — Razorpay's signature is computed over the exact raw bytes, and Nest's
   default JSON body-parser would re-serialize and break that; see §3.4).
2. Verify the signature (§3.4). If invalid: log a `PaymentGatewayEvent` row
   with `tenantId: null, signatureValid: false`, return `200 OK` anyway
   (§3.5 explains why 200, not 401/403).
3. Look up `providerOrderId` (from the payload) against
   `prisma.platform.payment.findFirst({ where: { providerOrderId } })` —
   **wait, per §2.2 there's no `Payment` row yet at order-creation time.**
   The order → tenant mapping instead comes from wherever the Payment Link
   was created (§4.1) — a lightweight `providerOrderId → tenantId, invoiceId`
   pointer that must exist *before* the webhook can possibly arrive. Two
   options, this doc recommends (a):
   - **(a)** Store that pointer directly on `Invoice` when the link is
     created: `Invoice.pendingGatewayOrderId String?` (nullable, cleared
     once resolved). Simplest — one denormalized field, one indexed lookup
     (`prisma.platform.invoice.findFirst({ where: { pendingGatewayOrderId:
     orderId } })`), no new table needed for this specific pointer.
   - **(b)** A separate `PaymentGatewayOrder` table (id, tenantId,
     invoiceId, providerOrderId, amount, createdAt). More normalized, but
     this phase has no other use for a standalone Order entity — Razorpay
     is already the system of record for order state, AutoNexa only needs
     enough to route the webhook.
   
   Recommend (a) for this phase; open for your call in sign-off.
4. Once `tenantId` is known, enter tenant context explicitly:
   `TenantContext.run({ tenantId, userId: <sentinel, see below>, isSuperAdmin: false }, async () => { ... })` —
   the same primitive `TenantContextInterceptor` uses per-request, just
   invoked directly instead of by the interceptor. Everything inside that
   callback can now safely use `prisma.forTenant()`, `TenantContext.requireTenantId()`,
   and — critically — `InvoicesService`'s own private `sendPaymentReceived`
   (§2.2's whole point: reuse the *exact* method manual payments call,
   which itself calls `TenantContext.requireTenantId()` internally and
   would throw outside this wrapper).
   - `TenantContextData.userId` has no natural value for a webhook-driven
     write. Recommend a fixed sentinel constant (e.g. `'system:razorpay-webhook'`)
     rather than `null`, since `AuditLog.userId`/`Payment` creation paths
     that might read `userId` from context elsewhere in this codebase
     currently assume a string. Flag this as a detail to confirm during
     build, not a blocking design question.
5. Inside that context, call the shared `InvoicesService.applyCapturedPayment(...)`
   (§2.2/§5) — the same overpayment guard + status rollup + customer
   notification as a manual payment, parameterized with the gateway fields.
6. Write the `PaymentGatewayEvent` row (now with `tenantId` populated)
   marking `processedAt`, regardless of outcome.

### 3.3 Idempotency

Razorpay explicitly documents that webhooks can be delivered more than
once (retries on non-2xx, network timeouts, etc.). `PaymentGatewayEvent`'s
`@@unique([provider, eventId])` is the guard: before doing anything else,
the handler attempts to insert the event row; a unique-constraint violation
means this exact event was already seen, so the handler returns `200 OK`
immediately without reprocessing. This is a database-enforced idempotency
key, not an in-memory check — safe under concurrent delivery of the same
retried webhook.

(Nuance: the insert-first-then-process ordering means step 3.2.6's "write
the event row" is really "step 0" — insert the row optimistically with
`processedAt: null`, and only update it to `processedAt: now()` once
processing genuinely completes. If processing crashes mid-way, the row
exists but `processedAt` stays null, which is also a useful "this event
needs manual review" signal.)

### 3.4 Signature verification

Razorpay signs each webhook with HMAC-SHA256 over the raw request body,
keyed by `RAZORPAY_WEBHOOK_SECRET` (a separate secret from the API
key/secret pair, configured in the Razorpay dashboard, never tenant-facing
or tenant-editable — platform-level env var, same tier as `SMTP_*`/
`TWILIO_*`, per your requirement). The signature arrives in the
`X-Razorpay-Signature` header; verification is `crypto.createHmac('sha256',
secret).update(rawBody).digest('hex') === header`, using a
constant-time comparison (`crypto.timingSafeEqual`), not `===` on the
hex strings (timing side-channel).

This is a small, pure, directly-unit-testable function
(`common/gateway/verify-razorpay-signature.ts` or similar) — exactly the
"extract as a pure function, test that" pattern this codebase already uses
for `job-card-status-transitions.ts`, `gst-split.ts`, etc. Planned tests:
valid signature accepted, tampered body rejected, wrong secret rejected,
missing header rejected.

### 3.5 Why the webhook always returns 200

Razorpay retries on any non-2xx response. Once the event is durably
recorded in `PaymentGatewayEvent` (§3.3), there's nothing to gain from a
retry — a genuine processing failure (e.g. a transient DB error while
applying the payment) should surface as `processedAt: null,
processingError: <message>` for manual investigation, not as an infinite
retry loop from Razorpay's side. The one case that legitimately wants a
retry — the DB being briefly unreachable *before* the event row itself
could even be written — will naturally surface as a 500 from the framework
(the request never got far enough to choose 200), which is fine to let
Razorpay retry.

### 3.6 Tenant isolation on the webhook path specifically

This is the trickiest part per your brief, so to state it plainly: the
*only* place tenant isolation could break here is step 3.2.3 (resolving
`providerOrderId → tenantId`) — everything after that point runs inside a
real `TenantContext.run()` block and gets the same enforcement as any other
request (`forTenant()`'s automatic `WHERE tenantId = ...`). The resolution
step itself is safe because `providerOrderId` values come from Razorpay
Order IDs, which are unique per Razorpay **merchant account** — and this
system uses one shared Razorpay account across all tenants (one
`RAZORPAY_KEY_ID`/`SECRET` pair platform-wide, not per-tenant), so a
`providerOrderId` collision across two different tenants' invoices is
structurally impossible — Razorpay itself guarantees the uniqueness this
lookup depends on.

Test coverage for this specifically (per your ask): two different tenants
each with an invoice and a pending gateway order; fire a webhook for
tenant A's order; assert tenant B's invoice/payments are completely
untouched, and that the resulting `Payment`/`AuditLog` rows carry tenant
A's `tenantId`, not a leaked/wrong one.

---

## 4. Payment Link Generation

### 4.1 Endpoint

`POST /invoices/:id/payment-link` — same permission as manual payment
recording, `@Permissions('payment:create')` (no new permission resource
needed; matches `POST /invoices/:id/payments`'s existing gate).

Flow:
1. Load the invoice (`InvoicesService.findOne`, existing method), compute
   outstanding balance (`computeInvoiceOutstanding`, already exists in
   `common/billing/outstanding.ts` — reused, not reimplemented).
2. Reject if outstanding is `0` (already fully paid) — `BadRequestException`,
   mirroring the existing style of guard exceptions in this module.
3. Call Razorpay's Payment Links API (`amount`, `currency: 'INR'`,
   `reference_id: invoice.invoiceNumber`, a `callback_url` back to the
   invoice page for after-payment redirect, `notes: { tenantId, invoiceId }`
   — Razorpay echoes `notes` back on the payment object, a second
   confirmation channel alongside `providerOrderId`, cheap to include).
4. Store the `providerOrderId → tenantId, invoiceId` pointer (§3.2's
   `Invoice.pendingGatewayOrderId`, recommendation (a)).
5. Return `{ shortUrl, providerOrderId, expiresAt }` to the caller.

### 4.2 Sending it to the customer

The frontend's existing "Send Invoice" button pattern
(`InvoiceDetailPage`'s `handleSend`, `POST /invoices/:id/send`) is the
precedent, not a new one: add a "Send Payment Link" action that calls
`POST /invoices/:id/payment-link`, then immediately calls
`MessagingService.notifyCustomer` with a new template —

```ts
// messaging/templates.ts
export interface PaymentLinkTemplateContext {
  workshopName: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  paymentUrl: string;
}

export function paymentLinkMessage(ctx: PaymentLinkTemplateContext): MessageContent {
  return {
    subject: `Pay invoice ${ctx.invoiceNumber} online — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, pay ${ctx.amount} for invoice ${ctx.invoiceNumber} online: ${ctx.paymentUrl} — ${ctx.workshopName}`,
  };
}
```

— same shape as every other template in that file, reused through the same
`notifyCustomer(tenantId, event, recipient, content, related)` call
`InvoicesService.resend()` already makes, with `event: 'invoice.payment-link'`
and no PDF attachment (a link, not a document).

### 4.3 Audit logging for this endpoint

Unlike the webhook, this route *is* authenticated and guard-protected, so
the normal `@Audit('invoice.payment-link.create', 'Invoice')` decorator
works exactly as it does everywhere else — no special-casing needed here,
only on the webhook route (§2.4).

---

## 5. Status Transition Reuse — the shared core

To honestly satisfy "must match existing payment-guard logic" and "don't
touch existing manual payment recording behavior" simultaneously, the plan
is to extract the guts of today's `recordPayment()` into a shared private
method both callers go through:

```ts
// invoices.service.ts — sketch, not final code
private async applyPayment(
  invoiceId: string,
  data: { amount: Prisma.Decimal | number; method: string; paymentDate?: Date; referenceNumber?: string;
           provider?: string; providerOrderId?: string; providerPaymentId?: string; providerSignature?: string },
) {
  const invoice = await this.assertExists(invoiceId);
  const db = this.prisma.forTenant();
  const existingPayments = await db.payment.findMany({ where: { invoiceId } });
  const totalPaidSoFar = existingPayments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));

  if (isOverpayment(totalPaidSoFar, invoice.grandTotal, data.amount)) {
    throw new BadRequestException('Payment would exceed the invoice grand total');
  }

  await db.payment.create({ data: { invoiceId, ...data } as unknown as Prisma.PaymentUncheckedCreateInput });

  const updated = await this.recalculateStatus(invoiceId);
  await this.sendPaymentReceived(updated, Number(data.amount));
  return updated;
}

async recordPayment(invoiceId: string, dto: CreateInvoicePaymentDto) {
  return this.applyPayment(invoiceId, { amount: dto.amount, method: dto.method, paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined, referenceNumber: dto.referenceNumber });
}

// called only from the webhook path, inside TenantContext.run()
async applyCapturedPayment(invoiceId: string, gateway: { amount: number; providerOrderId: string; providerPaymentId: string; providerSignature: string }) {
  return this.applyPayment(invoiceId, { amount: gateway.amount, method: 'razorpay', provider: 'razorpay', ...gateway });
}
```

`recordPayment`'s public signature and behavior are **unchanged** — this is
a refactor of its internals into a reusable shape, not a behavior change,
and existing tests for `recordPayment`/`isOverpayment`/`rollupPaymentStatus`
keep passing untouched. The overpayment guard applies identically to a
gateway payment (a Razorpay Payment Link is generated for a specific
outstanding amount, but nothing stops a race — two links open in two tabs,
both paid — from both landing; the guard is exactly what should catch
that, same as it would for two manual entries).

---

## 6. Failure & Expiry Handling

Razorpay Payment Links fire `payment_link.expired` (default: 7 days,
configurable) and `payment_link.cancelled` webhook events. Both are handled
identically to any other webhook (§3): verified, logged to
`PaymentGatewayEvent`, but **no `Payment` row is created and no invoice
state changes** — because none was ever created for this order (§2.2), the
invoice was never anything but its pre-existing status the whole time. The
only visible effect is `Invoice.pendingGatewayOrderId` being cleared (so a
future "generate a new link" call isn't confused by a stale pointer) and
the event existing in `PaymentGatewayEvent` for anyone checking "did the
customer ever open this link."

A `payment.failed` event (card declined, etc.) is handled the same way —
logged, no `Payment` row, invoice untouched, `pendingGatewayOrderId`
retained (Razorpay allows retrying the same Payment Link after a failed
attempt, unlike expiry/cancellation).

Staff-facing visibility into this (e.g. "3 failed attempts on this link")
is a reasonable frontend addition (the invoice detail page could show
`PaymentGatewayEvent` rows for its `pendingGatewayOrderId`) but isn't
required for this phase to function correctly — flagging it as a
nice-to-have, not blocking.

---

## 7. Security

- **Webhook secret vs API keys**: `RAZORPAY_WEBHOOK_SECRET` is distinct
  from `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` (Razorpay's own separation —
  the webhook secret only ever verifies inbound signatures, the API
  key/secret only ever authenticates outbound calls AutoNexa makes to
  Razorpay). All three are platform-level env vars, never
  `TenantSettings`-editable — same tier as `SMTP_*`/`TWILIO_*`, explicitly
  matching your requirement and this codebase's existing convention
  (`TenantSettings.slackWebhookUrl` is the one deliberate per-tenant
  exception documented in CLAUDE.md; this isn't another one).
- **The webhook route bypasses `JwtAuthGuard` but not scrutiny** —
  authenticity comes entirely from §3.4's signature check. A request with
  a missing/invalid signature is logged (`signatureValid: false`) and
  discarded, never trusted enough to touch `Invoice`/`Payment` data.
- **Rate limiting**: the existing `@nestjs/throttler` setup (already global
  per README/Phase 1 doc) applies to this route like any other — worth
  confirming during build that the webhook route isn't accidentally
  throttled tighter than Razorpay's real retry volume could trigger; likely
  needs its own relaxed throttle tier given it's a trusted, signature-gated
  server-to-server endpoint, not a public form.
- **PCI scope**: AutoNexa never receives, stores, or transmits card/UPI
  credentials — Razorpay's hosted Payment Link page handles all of that.
  Nothing in this design changes that boundary.
- **`rawPayload: Json` on `PaymentGatewayEvent`** stores the full webhook
  body for audit/dispute purposes — worth noting this could contain the
  customer's masked card details (last 4 digits, network) as Razorpay
  includes them in the payload; acceptable to store (not raw PAN/CVV, which
  Razorpay never sends), but flagging it so it's a conscious call, not an
  oversight.

---

## 8. New Environment Variables

Documented in README the same way as the existing messaging section:

| Variable | Required | Purpose |
|---|---|---|
| `RAZORPAY_KEY_ID` | no | Razorpay API key id — unset disables the "Send Payment Link" action entirely (button hidden/endpoint returns a clear "not configured" error, same pattern as `MessagingService` providers' `isConfigured()`) |
| `RAZORPAY_KEY_SECRET` | no (required if `RAZORPAY_KEY_ID` set) | Razorpay API key secret — used to create Orders/Payment Links |
| `RAZORPAY_WEBHOOK_SECRET` | no (required if the above are set) | HMAC secret configured in the Razorpay dashboard's webhook settings — verifies inbound webhook signatures |

A `RazorpayProvider` (or similar) with the same `isConfigured()` shape as
`EmailProvider`/`SmsProvider`/`WhatsAppProvider` is the natural fit —
consistent with how every other optional external integration in this
codebase degrades (unconfigured = feature quietly unavailable, never a
crash at boot).

---

## 9. Permissions

No new `resource:action` pair needed:
- `POST /invoices/:id/payment-link` → `@Permissions('payment:create')`
  (identical gate to manual payment recording — anyone who can record a
  payment can also generate a link for one).
- `POST /payments/webhooks/razorpay` → `@Public()`, no permission check
  (authenticity is the signature, not RBAC — there is no "user" on this
  request to check permissions against).

---

## 10. Testing Plan

Matching your ask, as pure-function/unit tests in `apps/api/test/` (this
codebase's established convention — colocated only on the frontend):

1. **`verify-razorpay-signature.spec.ts`** — valid signature accepted;
   tampered body rejected; wrong secret rejected; missing/malformed header
   rejected.
2. **`payment-gateway-idempotency.spec.ts`** (or covered via the webhook
   controller/service test below) — a duplicated `eventId` is a no-op
   second time, first-time processing result is unchanged by the replay.
3. **Invoice status transitions via `applyCapturedPayment`** — reusing the
   exact same table of cases `recordPayment`/`isOverpayment`/
   `rollupPaymentStatus` are presumably already tested against (full
   payment → PAID, partial → PARTIALLY_PAID, overpayment attempt →
   rejected) — proving the shared `applyPayment` core behaves identically
   regardless of which caller invokes it.
4. **Tenant isolation on the webhook path** (§3.6) — the two-tenant
   scenario described there: webhook for tenant A's order never touches
   tenant B's data, resulting rows carry the correct `tenantId`.
5. **Expiry/failure events** — `payment_link.expired`/`payment.failed`
   leave the invoice completely untouched (no `Payment` row, status
   unchanged), only `PaymentGatewayEvent` + `pendingGatewayOrderId`
   clearing (for expiry) are affected.

Given `recordPayment`'s public behavior is unchanged (§5), its existing
tests (if any) don't need modification — worth a quick check that they
still pass unmodified once the refactor lands, as the explicit regression
check for "didn't touch manual payment recording."

---

## 11. Open Questions for Sign-Off

1. **§3.2**: `Invoice.pendingGatewayOrderId` (option a) vs. a standalone
   `PaymentGatewayOrder` table (option b) for the order→tenant pointer.
   Recommend (a); flag if you'd rather keep `Invoice` untouched and use a
   small dedicated table instead.
2. **§3.2 step 4**: the `TenantContext.run()` sentinel `userId` for
   webhook-driven writes (`'system:razorpay-webhook'` or similar) — any
   preference, or leave it to implementation.
3. **§6**: whether staff-facing visibility into failed/expired link
   attempts on the invoice page is in-scope for this phase or a fast
   follow — currently proposed as a fast follow (data already captured in
   `PaymentGatewayEvent` either way).
4. **§7**: confirm the webhook route's throttle tier during build — not a
   design blocker, just needs a decision when the route actually exists.

---

## Status

Architecture is ready for review. Per instruction, **no application code
has been written yet.**

Once you sign off (including the two labeled decisions in §3.2 and §11),
next step is the Prisma migration (`Payment` extension +
`PaymentGatewayEvent` + `Invoice.pendingGatewayOrderId`), followed by
`PaymentsGatewayModule` (payment-link + webhook endpoints), the
`applyPayment` refactor in `InvoicesService`, the `paymentLinkMessage`
template, and the Jest test suite in §10.
