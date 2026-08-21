# AutoNexa — Customer Self-Service Estimate Approval Architecture

> Scope: architecture only, per instruction. No application code included yet.
> Scoped to one feature. Reuses two established patterns from the Razorpay
> phase directly: the "@Public() endpoint with its own verification, then
> manually enters TenantContext.run()" shape, and the "extract a shared
> private core so two callers get identical guard/side-effect behavior"
> refactor shape (`InvoicesService.applyPayment` there → an equivalent
> here).

---

## 1. Goal

A customer receives a WhatsApp/SMS/Email with a link. They open it, see
the estimate (line items, total, job description), and tap Approve or
Reject — no login, no app install. Staff's existing approve/reject buttons
keep working exactly as today, unchanged, for phone-based approvals.

---

## 2. Token Design

### 2.1 Signed, not stored

A JWT, not a random string looked up in a table. Payload:

```json
{ "estimateId": "<uuid>", "tenantId": "<uuid>", "purpose": "estimate-approval" }
```

Signed with a **new, dedicated secret** (`ESTIMATE_APPROVAL_SECRET`) via
`@nestjs/jwt`'s `JwtService` — the same library already signing access/
refresh tokens (`auth.module.ts`), just a separate registration with its
own secret. Not reusing `JWT_ACCESS_SECRET`: same reasoning as
`RAZORPAY_WEBHOOK_SECRET` being distinct from the Razorpay API secret —
whoever can mint one token type shouldn't be able to forge the other. Two
purpose-specific secrets already exist in this codebase (`JWT_ACCESS_SECRET`/
`JWT_REFRESH_SECRET`); this is a third, same pattern.

`AuthModule`'s `JwtModule.registerAsync(...)` is not exported (only
`AuthService` is — see `auth.module.ts`'s `exports`), so the new module
registers its **own** `JwtModule` instance rather than trying to reach into
auth's. Nest supports any number of independently-configured `JwtService`
instances app-wide; this isn't a workaround, it's the intended usage.

### 2.2 What actually makes this secure

Worth being precise about this, since the requirement is phrased as "not a
guessable sequential ID": `Estimate.id` is already a UUID, already
unguessable — that was never the vulnerability a sequential ID would have
been. The **signature** is what's actually load-bearing here: without it,
anyone could construct `{estimateId: <any-real-uuid-they-found>, tenantId:
<any-real-uuid>}` themselves and hit the endpoint directly. HMAC
verification (rejecting anything not signed with `ESTIMATE_APPROVAL_SECRET`)
is the actual control; the UUID's unguessability is a secondary property
that was already true for unrelated reasons.

### 2.3 Expiry: 7 days, proposed

`expiresIn: '7d'` on `JwtService.sign()` — a plain constant in code, not an
env var (this is a business-policy knob, not a secret; happy to make it
configurable if you'd rather). `JwtService.verify()` throws
`TokenExpiredError` on an expired token, `JsonWebTokenError` on a
tampered/malformed one — the service catches both and returns distinct
outcomes (§4.3), but the customer-facing error text is deliberately similar
for both ("this link is invalid" vs "this link has expired") — not
identical, because *unlike* a login failure (where revealing "wrong
password" vs "no such account" is the actual attack surface), there's
nothing sensitive being protected by hiding which failure occurred here.

### 2.4 Single-use — free, from the existing status guard

This is the one genuinely elegant part of reusing the existing code:
`EstimatesService`'s private `transition()` already refuses to move an
estimate to `APPROVED`/`REJECTED` unless it's currently `SENT` (§5's shared
core). A token that's already been acted on doesn't need its own
"consumed" flag — the **estimate's own status** already blocks a second
decision. Click the same link twice: first click flips `SENT → APPROVED`;
second click's `transition()` call sees `APPROVED`, not `SENT`, and throws
the same `BadRequestException` a staff member double-clicking Approve
would get today. No new column, no extra state to keep in sync with
`Estimate.status`, nothing that could drift.

The **GET** (viewing the estimate) stays available regardless of status —
read-only, harmless, and useful (the customer can revisit the link to see
what they decided).

### 2.5 Regenerating an expired/lost link

`EstimatesController.send()` only transitions `DRAFT → SENT` — calling it
again on an already-`SENT` estimate throws (wrong `fromStatus`). That's
correct for *first* send, but there's currently no way to *resend* once
already `SENT` — same gap `InvoicesService.resend()` exists to fill for
invoices. Proposing the same shape: `EstimatesService.resendApprovalLink(id)`,
callable only when `status === SENT`, mints a fresh token (new 7-day
window) and re-sends the message — **does not touch `Estimate.status`**,
same as invoice resend never touches `InvoiceStatus`. A new
`@Permissions('estimate:update') @Post(':id/resend-approval-link')` on the
existing `EstimatesController`, right alongside `send()`.

---

## 3. New Endpoints

New sibling module, `EstimateApprovalModule` — same reasoning as
`PaymentsGatewayModule` being its own module rather than living inside
`InvoicesModule`: it needs its own `JwtModule` registration and its own
`@Public()`/throttling posture, and `EstimatesModule` has no reason to know
this exists. One-directional import (`EstimateApprovalModule` → imports
`EstimatesModule`, which already exports `EstimatesService`) — no
circularity, same shape as the gateway phase.

```
GET  /estimates/approve/:token           — read-only summary
POST /estimates/approve/:token/approve   — customer approves
POST /estimates/approve/:token/reject    — customer rejects
```

Mirrors the staff side's two-separate-endpoints shape
(`:id/approve`/`:id/reject`) rather than one generic `{decision}` body —
consistent with the existing convention, and it keeps the audit event's
`action` unambiguous from the route alone.

All three `@Public()` (bypass `JwtAuthGuard`, same as the Razorpay webhook)
and `@Throttle()`-overridden (§6) — the codebase's global default
(`ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])`, `app.module.ts`)
has never actually been overridden per-route anywhere yet; this is the
first use of `@Throttle()`, worth flagging as such since there's no
existing precedent to match style against.

### 3.1 Tenant resolution — simpler than the webhook's

The Razorpay webhook had to resolve tenantId via an **unscoped DB lookup**
(`prisma.platform.invoice.findFirst({ where: { pendingGatewayOrderId }})`)
because Razorpay's payload only echoes back what AutoNexa put in `notes` —
nothing cryptographically tied to a tenant. Here, tenantId is a **verified
claim inside a token AutoNexa itself signed** — once `JwtService.verify()`
succeeds, `tenantId` is trustworthy immediately, no DB round-trip needed to
establish it. Enter `TenantContext.run({ tenantId, userId: <sentinel>,
isSuperAdmin: false }, ...)` (same sentinel-userId reasoning as the
webhook — see the Payment Gateway doc §3.2) directly off the verified
payload, then `prisma.forTenant()` works normally for everything after.

This also means `EstimateApprovalEvent` (§4) *can* live in
`TENANT_SCOPED_MODELS` normally — unlike `PaymentGatewayEvent`, which had
to have a nullable `tenantId` because a forged/malformed webhook might
never resolve one. Here, by the time anything gets written, the JWT has
already verified and tenantId is known — the only thing to decide is
*which* `action` to log (§4.2).

### 3.2 Response shape — deliberately narrow

Per the requirement ("no other tenant data reachable from it"), the GET
response is a purpose-built summary, not `EstimatesService.findOne()`'s
full row:

```ts
interface EstimateApprovalSummary {
  estimateNumber: string;   // same `EST-${id.slice(0,8).toUpperCase()}` synthesis send() already uses — never stored
  status: EstimateStatus;   // so the frontend can show "already approved" instead of just erroring
  jobDescription: string | null;
  vehicleLabel: string;     // "TN 37 AB 1234 BMW X5" — same join shape estimateReadyMessage's ctx already builds
  customerName: string;     // first-name-safe to show back to the person reading it — not their email/mobile
  lineItems: { description: string; quantity: string; unitPrice: string; gstRate: string; lineTotal: string }[];
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
}
```

No `customer.email`/`customer.mobile`, no internal ids beyond what's
already embedded in the token, no other customer's/vehicle's data
reachable — the query itself only ever fetches the one estimate the
verified token names.

---

## 4. Audit Trail

### 4.1 New table: `EstimateApprovalEvent`

Proposing the dedicated table over a couple of extra columns on `Estimate`
— matches this codebase's existing **append-only history** convention
(`JobCardStatusHistory`, `JobCardNote`, `InventoryTransaction`, and now
`PaymentGatewayEvent`) rather than mutable fields that only capture the
*last* thing that happened. Concretely, columns can't tell "customer
viewed this three times over two days, then approved" from "customer
approved instantly" — a real difference for a "defensible record."

```prisma
model EstimateApprovalEvent {
  id          String   @id @default(uuid())
  tenantId    String
  estimateId  String
  estimate    Estimate @relation(fields: [estimateId], references: [id])
  action      String   // "VIEWED" | "APPROVED" | "REJECTED" | "TOKEN_EXPIRED" | "TOKEN_INVALID" | "ALREADY_DECIDED"
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([tenantId, estimateId])
  @@map("estimate_approval_events")
}
```

Free-string `action`, not an enum — matches `InventoryTransaction`-adjacent
precedent of using enums for real domain states but plain strings for
"what kind of log entry is this," and it means a new failure category
later (e.g. `RATE_LIMITED`) doesn't need a migration.

Logs **every** hit, not just successful approve/reject — `VIEWED` on every
GET, plus the failure categories on a rejected token. This is the "defensible
record" the requirement asks for: proof the customer (or *someone* from
their IP) opened the link before acting, and a forensic trail if a token
gets probed/reused after the fact. `TOKEN_EXPIRED`/`TOKEN_INVALID` events
necessarily can't carry a `tenantId` if the token failed to verify at all
(no trustworthy claim to read) — those two specific outcomes are the one
case still written via `prisma.platform` with `tenantId: null`, mirroring
`PaymentGatewayEvent`'s handling of an unverifiable signature. Every other
outcome (`VIEWED`, `APPROVED`, `REJECTED`, `ALREADY_DECIDED`) has already
passed signature verification, so it's tenant-scoped normally.

### 4.2 Staff-visible notification stays shared, not duplicated

`EstimatesService.approve()` today creates a broadcast `Notification` row
("Estimate approved") after transitioning status. That side effect needs
to fire identically regardless of *who* approved it — proposing to extract
`approve()`/`reject()`'s guts into a shared private `applyDecision(id,
decision, source: 'staff' | 'customer')`, the same "shared core, two thin
callers" shape as the gateway phase's `applyPayment`. The public
controller calls `applyDecision(estimateId, 'APPROVED', 'customer')`; the
existing `EstimatesController.approve()` calls
`applyDecision(id, 'APPROVED', 'staff')`. One codepath for the transition
guard and the notification; the only difference is a string tucked into
the notification message ("Estimate approved by customer" vs "Estimate
approved") so staff can tell which happened without needing to check the
audit table.

### 4.3 What each outcome actually does

| Situation | HTTP result | `EstimateApprovalEvent.action` | `Estimate.status` |
|---|---|---|---|
| Valid token, first view | 200, summary | `VIEWED` | unchanged |
| Valid token, estimate still `SENT`, customer approves | 200 | `APPROVED` | `SENT → APPROVED` |
| Valid token, estimate still `SENT`, customer rejects | 200 | `REJECTED` | `SENT → REJECTED` |
| Valid token, estimate already `APPROVED`/`REJECTED`/anything but `SENT` | 400, "This estimate has already been decided." | `ALREADY_DECIDED` | unchanged |
| Expired token | 404, "This link has expired. Contact the workshop for a new one." | `TOKEN_EXPIRED` (tenantId null) | unchanged |
| Malformed/wrong-signature token | 404, "This link is invalid." | `TOKEN_INVALID` (tenantId null) | unchanged |

404, not 401/403, for the two token-failure rows — there's no "you" to
authenticate or authorize here, and a 404 gives an attacker probing token
guesses no signal about *why* a given string didn't work (expired vs
never-valid look the same from outside, deliberately).

---

## 5. Reuse of `estimate-totals.ts`

`calculateEstimateTotals`/`calculateLineTotal` (already pure, already
tested) aren't touched at all — the summary endpoint reads
`Estimate.subtotal`/`taxAmount`/`total`, which `recalculate()` already
kept correct on every line-item mutation. Nothing new to compute; this is
purely a read + a narrower projection of existing, already-correct data.

---

## 6. Rate Limiting

Proposing a tighter, endpoint-specific `@Throttle()` (from `@nestjs/throttler`,
already a dependency, just not yet used per-route anywhere in this
codebase):

- `GET /estimates/approve/:token` — 20 requests/60s per IP. Generous
  enough for a customer refreshing/reopening the link a few times, tight
  enough to blunt token-guessing traffic (a UUID pair is astronomically
  unguessable regardless, but the signature check is cheap and this adds
  a second layer for free).
- `POST .../approve` and `.../reject` — 5 requests/60s per IP. These are
  one-shot actions; nobody legitimately needs more than a couple of
  attempts in a minute, and a tighter cap here specifically deters
  scripted probing of the decision endpoints.

Both sit *under* the global 100/60s default, which still applies to
everything else unaffected by this change.

---

## 7. How This Plugs Into `send()`

`EstimatesService.send()` (`DRAFT → SENT`, already builds and sends
`estimateReadyMessage`) gets one addition: mint the token, build the URL
(`${FRONTEND_URL}/estimates/approve/${token}` — reusing the exact
`FRONTEND_URL` config introduced in the Razorpay phase for the payment
link's callback), and pass it into the template. `estimateReadyMessage`'s
context gains one field:

```ts
export interface EstimateTemplateContext {
  workshopName: string;
  customerName: string;
  vehicleLabel: string;
  estimateNumber: string;
  grandTotal: string;
  approvalUrl: string; // new
}
```

```ts
export function estimateReadyMessage(ctx: EstimateTemplateContext): MessageContent {
  return {
    subject: `Estimate ${ctx.estimateNumber} ready for approval — ${ctx.workshopName}`,
    body: `Hi ${ctx.customerName}, estimate ${ctx.estimateNumber} for ${ctx.vehicleLabel} (${ctx.grandTotal}) is ready for your approval: ${ctx.approvalUrl} — ${ctx.workshopName}`,
  };
}
```

The existing "Please contact us to confirm" phrasing is replaced by the
actual link — staff can still call the customer if they prefer, but the
self-service path is now the default invitation. `resendApprovalLink()`
(§2.5) builds the same message with a freshly-minted token.

`EstimateApprovalModule` needs `MessagingService` too (to send the
resend-link message) — imports `MessagingModule` directly, same as
`EstimatesModule` and `PaymentsGatewayModule` both already do.

---

## 8. Frontend

One new, unauthenticated route: `apps/web/app/estimates/approve/[token]/page.tsx`
— deliberately **outside** both `(auth)` and `(dashboard)` route groups, so
it only inherits the root `app/layout.tsx` (fonts, dark-mode script,
`ThemeProvider`) and none of the dashboard chrome (`Sidebar`/`Topbar`) or
the login page's photo backdrop. `AuthProvider` still wraps it at the root
layout level, but the page never calls `useAuth()` — a visitor with no
session sees the exact same page as a visitor who happens to also be
logged into the dashboard elsewhere; this route doesn't care either way.

- On load: `apiGet('/estimates/approve/:token')` — `api-client.ts`'s
  `apiFetch` already only attaches an `Authorization` header when
  `accessToken` is set in memory; for an anonymous visitor it's simply
  absent, which is exactly what an unauthenticated endpoint needs.
- States: loading skeleton → error (invalid/expired/already-decided, each
  showing the exact message the API returned) → summary (line items table,
  totals, job description, two buttons) → decided (after a successful
  approve/reject, show a plain confirmation, buttons removed — no need to
  re-fetch just to re-render the disabled state).
- Mobile-first single column, no sidebar-width assumptions — this is the
  one page in the app that must work well on a phone screen with zero
  onboarding, since that's the only device most customers will open it on.

---

## 9. New Environment Variable

| Variable | Required | Purpose |
|---|---|---|
| `ESTIMATE_APPROVAL_SECRET` | yes (once this ships) | Signs/verifies the customer approval link's JWT — dedicated secret, not shared with `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` or `RAZORPAY_WEBHOOK_SECRET` |

`FRONTEND_URL` already exists (added in the Razorpay phase) — reused
as-is, not duplicated.

---

## 10. Testing Plan

Same constraint as the Razorpay phase: this codebase's established
convention is pure-function/DTO tests only (`apps/api/test/`), no
service-level tests against a mocked Prisma client. Matching your
requested cases to what's actually extractable as pure functions:

1. **Token verify/decode as its own pure-ish unit** — wrapping
   `JwtService.verify()` isn't itself pure (it's a library call), but the
   *outcome classification* (valid → payload; `TokenExpiredError` →
   `'expired'`; anything else → `'invalid'`) can be a small pure function
   (`classifyTokenVerification(error): 'expired' | 'invalid'`) — tested
   directly, mirroring `verify-razorpay-signature.spec.ts`'s style.
2. **`applyDecision`'s transition guard** — already effectively covered by
   whatever existing tests exercise `EstimatesService`'s `transition()`
   guard today (worth confirming they still pass unmodified post-refactor,
   same "prove the shared-core extraction didn't change behavior" check
   as the Payment Gateway phase's `recordPayment`).
3. **Double-approval / already-decided** — same guard, different angle:
   assert a second `applyDecision` call on an already-`APPROVED` estimate
   throws, regardless of `source`.
4. What the requirement calls "reused token" and "double approval attempt"
   are actually the **same case** here, per §2.4 — there's no separate
   "token" state to reuse-detect; it's the estimate's status guard doing
   double duty. One test category, not two.
5. **Wrong-tenant isolation** — structurally simpler to reason about than
   the webhook's (§3.1: tenantId comes from a verified signature, not an
   unscoped lookup), but still worth a live/manual check the same way the
   Payment Gateway phase's tenant-isolation claim was verified live rather
   than via a new mocked-service test pattern: mint a token for tenant A's
   estimate, confirm the resulting `TenantContext`-scoped query never
   touches tenant B's data even if a tenant-B estimate shares low bits of
   its UUID (astronomically unlikely, but the isolation is structural —
   scoped by the verified claim — not by luck).
6. **Rate-limit behavior**: `@nestjs/throttler`'s own guard logic isn't
   something this codebase has a testing pattern for yet either (first use
   of `@Throttle()`, per §6) — proposing to verify this live (rapid-fire
   `curl` past the configured limit, confirm a `429`) rather than inventing
   a new automated-test pattern for a third-party guard's behavior.

---

## 11. Open Questions for Sign-Off

1. **§2.3**: 7-day expiry as a hardcoded constant, or should it be env-
   configurable? Leaning hardcoded (it's policy, not a secret) but easy
   either way.
2. **§2.5**: `resendApprovalLink()` as a new endpoint on the existing
   `EstimatesController`, separate from `send()` — confirm that's the
   right split rather than, say, making `send()` itself idempotent/re-
   callable from `SENT`.
3. **§4.1**: logging every `VIEWED` hit, not just approve/reject — useful
   forensic value, but confirm you want that volume of rows (a customer
   opening the link 5 times is 5 rows) rather than only logging
   approve/reject/failures.
4. **§6**: the specific throttle numbers (20/min view, 5/min decide) are a
   starting proposal, not derived from anything — adjust if you have a
   different sense of realistic customer behavior vs abuse traffic.

---

## Status

Architecture is ready for review. Per instruction, **no application code
has been written yet.**

Once you sign off, next step is the Prisma migration (`EstimateApprovalEvent`
only — no changes to `Estimate` itself, per §2.4's token-is-stateless
design), the `applyDecision` refactor in `EstimatesService`, the
`ESTIMATE_APPROVAL_SECRET`-keyed `JwtModule` registration in the new
`EstimateApprovalModule`, the three public endpoints, the
`estimateReadyMessage` template update, the frontend route, and the test
suite in §10.
