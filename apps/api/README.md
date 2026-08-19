# AutoNexa API — Phases 2–7: Auth/Tenancy/RBAC + CRM + Front-of-House + Operational Core + Inventory + Billing

This is the backend built so far: everything Phase 8 (Reports, Dashboard,
Notifications) will build on top of.

## What's in Phase 2 (foundation)

- **Multi-tenant data isolation** — `PrismaService.forTenant()` + an
  AsyncLocalStorage-based `TenantContext` auto-injects/filters `tenantId`
  on every tenant-scoped query. Services never pass `tenantId` by hand.
- **Auth** — JWT access tokens (15 min default) + rotating refresh tokens
  (30 days default, httpOnly cookie), argon2 password hashing, reuse
  detection (a replayed, already-rotated refresh token revokes its whole
  token family).
- **RBAC** — global `resource:action` permission catalogue, tenant-owned
  roles that compose permissions, `@Permissions(...)` decorator + guard
  enforced server-side on every route.
- **Tenant provisioning** — Super Admin-only endpoint that creates a new
  workshop tenant with its default settings, all 7 default roles (from the
  Phase 1 matrix), and its first Workshop Owner user, in one transaction.
- **Audit logging** — `@Audit(action, entity)` decorator + interceptor
  writes an `AuditLog` row after mutating routes succeed.

## What's in Phase 3 (CRM foundation)

- **Customers** — full CRUD, paginated search (name/mobile/email), soft
  delete. `GET /customers/:id` returns vehicles, invoices (each with a
  computed `outstanding`), and a `totalOutstanding` across unpaid/
  partially-paid invoices — closed as of Phase 7, see below.
- **Vehicles** — full CRUD scoped to a customer, paginated search
  (registration no / VIN / brand / model), document attachments (insurance,
  RC, PUC, warranty — metadata only; actual files live in object storage
  per the Phase 1 File Storage module), and a `GET /vehicles/:id/service-history`
  endpoint whose response contract is stable now and gets populated once
  Inspections/Estimates/Job Cards/Invoices exist.

## What's in Phase 4 (front-of-house workflow)

- **Appointments** — full CRUD scoped to a customer/vehicle, soft delete.
  `GET /appointments` doubles as the calendar-view query: add `from`/`to`
  (date-range) and/or `status` to the same paginated list endpoint instead
  of a second colliding route.
- **Inspections** — `POST /inspections` auto-creates the standard
  exterior/interior/mechanical checklist (18 items, from
  `default-inspection-checklist.ts`) against the vehicle; ad-hoc items can
  still be added via `POST /inspections/:id/items`. Item results/remarks are
  updated one at a time via `PATCH /inspections/:id/items/:itemId`. Photos
  are metadata-only records (`POST /inspections/:id/photos`), same pattern
  as vehicle documents.
- **Estimates** — line items live under their own sub-resource
  (`POST/PATCH/DELETE /estimates/:id/line-items[/:itemId]`); `subtotal`,
  `taxAmount`, and `total` are always recalculated server-side from the line
  items after every change (see `estimate-totals.ts` — a pure, unit-tested
  function, never trusts a client-supplied total). `POST /estimates/:id/send`
  (`DRAFT` → `SENT`) then `.../approve`/`.../reject` (only from `SENT`).

## What's in Phase 5 (operational core)

- **Labour Catalogue** (`labour-items`) — full CRUD, soft delete, standard
  hours/rate/GST per labour item.
- **Technicians** — a technician profile wraps an existing `User` (one
  technician per user, enforced at creation with a clean `409` if the user's
  already a technician, not a raw DB constraint error). No delete endpoint —
  `Technician` has no `deletedAt`; deactivation goes through `status`
  (`ACTIVE`/`ON_LEAVE`/`INACTIVE`) via the normal `PATCH`. `GET /technicians/:id`
  returns the stored profile plus computed workload — `jobsOpen`,
  `jobsCompleted`, `totalLabourHours`, and (closed as of Phase 7)
  `revenueGenerated` — all derived from `JobCard`/`JobCardLabour`/`Invoice`
  on every read, never stored redundantly.
- **Job Cards** — the operational core:
  - **Numbering**: `{tenantId, "JOB_CARD"}` atomically incremented against
    `TenantSequence` inside the same transaction as the `JobCard` insert, so a
    rolled-back create also rolls back the increment. Formatted as
    `{TenantSettings.jobCardPrefix}-{number padded to 4 digits}`, e.g.
    `JC-0001`. The increment+format logic lives in
    `common/sequence/generate-sequence-number.ts`, reused as-is by Purchase
    Orders (`PO-0001`) and now Invoices (`INV-0001`).
  - **Status pipeline**: `PATCH /job-cards/:id/status` validates against an
    explicit allowed-transitions map (`job-card-status-transitions.ts`, pure
    and unit-tested — no DB, no NestJS) — invalid transitions `400`. Every
    successful transition (including the initial `OPEN` on creation) writes
    an append-only `JobCardStatusHistory` row; transitioning into `DELIVERED`
    stamps `actualDelivery`.
  - **Labour lines**: `POST /job-cards/:id/labour` looks up the `LabourItem`
    by id and snapshots `rate`/`gstRate` onto the `JobCardLabour` row —
    catalogue rate changes later never retroactively change what a past job
    card billed.
  - **Estimate conversion**: `POST /estimates/:id/convert-to-job-card` (only
    from `APPROVED`) creates the `JobCard`, converts each `LABOUR` estimate
    line into a `JobCardLabour` row, skips `PART`/`CONSUMABLE` lines with a
    comment (adding parts to a job card is a deliberate manual step that
    deducts real stock — see Phase 6 — so conversion can't safely auto-consume
    inventory on the technician's behalf; a technician adds them explicitly
    via `POST /job-cards/:id/parts` once work starts), and only then flips
    the Estimate to `CONVERTED`. The rate/gstRate charged on the converted
    `JobCardLabour` line is **always** the estimate line's own approved
    `unitPrice`/`gstRate` — a catalogue `LabourItem` match by description
    only populates `labourItemId` for categorization, it never overrides the
    approved price (see `resolve-converted-labour-line.ts`, pure and
    unit-tested: approved-price integrity, not live catalogue pricing).

## What's in Phase 6 (parts, inventory, suppliers, purchases)

- **Parts** (`parts`, `part-categories`) — full CRUD, soft delete.
  `currentStock` always starts at 0 and only ever moves through
  `InventoryTransaction`-backed operations (goods receipt, job card
  add/remove) — there's no opening-balance/adjustment endpoint, so it stays
  reconcilable against the ledger. `GET /parts?lowStock=true` filters to
  `currentStock <= minStock` (feeds the Phase 1 dashboard's low-stock card);
  since Prisma has no field-to-field `where` comparison, this one filter is
  applied in memory after fetching the other filters' matches — cheap
  because low-stock result sets are inherently small. `GET /parts/:id/stock-ledger`
  returns that part's paginated `InventoryTransaction` history, newest first
  — the audit trail for when `currentStock` looks wrong.
- **Suppliers** (`suppliers`) — full CRUD, soft delete, standard.
- **Purchase Orders** (`purchase-orders`) — `poNumber` generated the same
  way as `jobCardNumber` (`PO-0001`, …). Items are fixed at creation (no
  add/edit/remove-item endpoints — only `quantityReceived` moves, via
  receiving). `POST /purchase-orders/:id/receive` accepts
  `{purchaseOrderItemId, quantityReceived}[]` and, in one transaction:
  books a `GoodsReceipt` + its line items, increments each `Part.currentStock`,
  writes a `PURCHASE_IN` `InventoryTransaction` per line, updates
  `quantityReceived`, and rolls the PO's status up to `PARTIALLY_RECEIVED`
  or `RECEIVED` (`purchase-order-receiving.ts`, pure and unit-tested — both
  the over-receiving rejection and the status rollup). Receiving is
  incremental: a PO can be received across multiple partial deliveries.
- **Purchase Invoices** (`purchase-invoices`) & **Supplier Payments**
  (`supplier-payments`) — `PurchaseInvoice.subtotal/taxAmount/total` are
  client-supplied (they record what the supplier's own invoice document
  says — an external fact), unlike Estimate's server-computed totals, which
  we control end-to-end. `status` (`UNPAID` → `PARTIALLY_PAID` → `PAID`) is
  always recomputed from sum-of-payments vs total after every payment, via
  the shared `rollupPaymentStatus` (see Phase 7 — this used to be a
  Purchase-Invoice-only function, refactored to a generic one once Invoice
  needed the identical logic), never set directly. `SupplierPayment` has no
  update/delete — same append-only discipline as
  `InventoryTransaction`/`JobCardStatusHistory`; corrections are new
  entries, not edits.
- **JobCardPart** (nested under `job-cards`, not its own module) —
  `POST /job-cards/:id/parts` snapshots `unitPrice`/`gstRate` from `Part` at
  add time (same discipline as `JobCardLabour.rate`).
  > **Stock deducts when a part is ADDED to a job card, not deferred to
  > invoicing.** This is a deliberate deviation from the Phase 1 doc's
  > literal "Job Card Invoiced → Inventory Reduced" wording: physically the
  > part leaves the shelf when it's used, not when the paperwork is
  > generated. Insufficient stock is rejected with `400` before anything is
  > written; the actual concurrency-safe guard is a
  > `WHERE currentStock >= quantity` UPDATE (not a plain
  > read-then-check-then-decrement), since Postgres evaluates that WHERE
  > clause atomically against the row's state at UPDATE time — the exact
  > inventory race the Phase 1 architecture doc's risk table calls out.
  > `DELETE /job-cards/:id/parts/:lineId` reverses it symmetrically
  > (restores stock, logs a positive `RETURN` transaction), only while the
  > job card isn't `DELIVERED`/`CANCELLED`.

## What's in Phase 7 (billing / GST invoicing, payments)

- **⚠️ Setup step: set `TenantSettings.state`** (`PATCH /tenants/me/settings
  {"state": "Tamil Nadu"}`) — the workshop's own home state, needed to
  determine CGST+SGST (same state as the customer) vs IGST (different
  state) on generated invoices. See the fallback behavior below if this
  isn't set.
- **Invoice generation** — `POST /job-cards/:id/generate-invoice`, only
  valid from `READY_FOR_DELIVERY`/`DELIVERED` (`400` otherwise), rejects a
  second invoice for the same job card with a clean `409` (the DB unique
  constraint on `jobCardId` would also catch it, but this gives a readable
  error first). In one transaction: pulls every `JobCardLabour`/`JobCardPart`
  row for the job card and snapshots each into an `InvoiceLineItem`
  (description, quantity, unitPrice, gstRate, lineTotal — never a live
  re-read of `Part`/`LabourItem` pricing, since those rows were themselves
  already snapshotted when added to the job card), computes the GST split,
  computes `roundOff` (nearest whole rupee; `roundOff = rounded - unrounded`),
  and creates the `Invoice` with `invoiceNumber` generated the same way as
  `JobCard`/`PurchaseOrder` numbering (`INV-0001`, …).
- **GST split** (`gst-split.ts`, pure and unit-tested, mirrors
  `resolve-converted-labour-line.ts`'s style) — same state (tenant home
  state === customer state): half each line's GST as CGST, half as SGST.
  Different state: the full line GST as IGST.
  > **Fallback when either state is unset: treated as SAME-STATE
  > (CGST+SGST).** This is the safer operational default for a
  > single-location Indian workshop whose customer base is typically local
  > — silently defaulting to IGST instead would be the more surprising
  > failure mode. It lets invoice generation succeed with a usable (if not
  > perfectly accurate) split rather than blocking outright, but tenants
  > should still set `TenantSettings.state` for GST accuracy.
- **Payments** — `POST /invoices/:id/payments` records a `Payment`
  (append-only, no update/delete — same discipline as `SupplierPayment`/
  `InventoryTransaction`) then recomputes `Invoice.status` via the shared
  rollup. Overpayment (a payment that would push total-paid past
  `grandTotal`) is rejected outright with `400` — no special-casing for
  `method: "credit"` — via a pure `isOverpayment` predicate
  (`payment-guard.ts`, unit-tested).
- **Shared `rollupPaymentStatus`** (`common/billing/rollup-payment-status.ts`)
  — generic over the status enum's three values (`unpaid`/`partiallyPaid`/`paid`),
  since `PurchaseInvoiceStatus` and `InvoiceStatus` are distinct
  Prisma-generated types that happen to share the same three states.
  `PurchaseInvoicesService` was refactored in this phase to call this
  directly (its old `purchase-invoice-status.ts` wrapper is gone) instead
  of duplicating the same sum-of-payments arithmetic a second time.
- **Customer outstanding** (closes the Phase 3 TODO) — `GET /customers/:id`
  now includes `invoices` (each with a computed `outstanding = grandTotal -
  sum of payments`) and a `totalOutstanding` across `UNPAID`/`PARTIALLY_PAID`
  invoices.
- **Technician revenue** (closes the Phase 5 TODO) — `GET /technicians/:id`'s
  `revenueGenerated` sums `JobCardLabour.lineTotal` across the technician's
  job cards where a `PAID` `Invoice` now exists — labour revenue
  specifically, not parts (parts aren't "generated" by their labour).

**Explicitly out of scope for Phase 7**: PDF generation and WhatsApp/print
sharing (Phase 1 lists these, but they're a later polish pass on top of this
data model, not core to it) — just the data model and REST API here.

## Modules

`auth`, `tenants`, `branches`, `users`, `roles`, `permissions`, `customers`,
`vehicles`, `appointments`, `inspections`, `estimates`, `labour-items`,
`technicians`, `job-cards`, `parts`, `suppliers`, `purchase-orders`,
`purchase-invoices`, `supplier-payments`, `invoices`

## Setup

```bash
cp .env.example .env
# edit .env — at minimum set DATABASE_URL to a real Postgres instance
# and change JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / SUPER_ADMIN_PASSWORD

npm install
npx prisma migrate dev --name phase7_billing_gst_payments
npm run prisma:seed
npm run start:dev
```

API docs: `http://localhost:4000/api/docs`

After seeding, **set your tenant's home state** before generating any real
invoices — GST accuracy depends on it (see the Phase 7 section above):

```bash
curl -X PATCH http://localhost:4000/tenants/me/settings \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"state": "Tamil Nadu"}'
```

## Try it

```bash
# Log in as the seeded demo Workshop Owner
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"demo-workshop","email":"owner@demoworkshop.test","password":"ChangeMe123!"}'

# Build a job card up to READY_FOR_DELIVERY, add labour/parts along the way,
# then generate its invoice — subtotal/CGST/SGST/IGST/roundOff/grandTotal
# all come back server-computed.
curl -X POST http://localhost:4000/job-cards/<jobCardId>/generate-invoice \
  -H "Authorization: Bearer <accessToken>"

# Pay it down — status flips UNPAID -> PARTIALLY_PAID -> PAID automatically.
# A payment that would exceed grandTotal is rejected with 400.
curl -X POST http://localhost:4000/invoices/<invoiceId>/payments \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"amount": 1000, "method": "upi"}'

# The customer's outstanding balance across all their invoices.
curl http://localhost:4000/customers/<customerId> \
  -H "Authorization: Bearer <accessToken>"
```

## Notes on this codebase

- **`prisma generate` requires network access** to `binaries.prisma.sh` to
  download the query engine. If you're behind a restrictive proxy/firewall,
  see Prisma's docs on custom engine binary targets or offline install.
- **Type-checked** with `npx tsc --noEmit` against a real generated Prisma
  client — if you added/changed schema, re-run `npx prisma generate` before
  `tsc` or your IDE will show stale types.
- **`PrismaService.forTenant()` enforcement list** (`TENANT_SCOPED_MODELS`
  in `src/prisma/prisma.service.ts`) must be extended every time a new
  tenant-owned model is added in a later phase — this is the single most
  important file to keep in sync with `schema.prisma`. Phase 3 added
  `Customer`, `Vehicle`, and `VehicleDocument`; Phase 4 added `Appointment`,
  `Inspection`, `InspectionItem`, `InspectionPhoto`, `Estimate`, and
  `EstimateLineItem`; Phase 5 added `LabourItem`, `Technician`, `JobCard`,
  `JobCardLabour`, `JobCardStatusHistory`, and `JobCardNote`; Phase 6 added
  `PartCategory`, `Part`, `InventoryTransaction`, `Supplier`, `PurchaseOrder`,
  `PurchaseOrderItem`, `GoodsReceipt`, `GoodsReceiptItem`, `PurchaseInvoice`,
  `SupplierPayment`, and `JobCardPart`; Phase 7 added `Invoice`,
  `InvoiceLineItem`, and `Payment`.
- **`PrismaService.platform` is a constructor-assigned field, not a
  getter.** Prisma Client wraps the instance in a Proxy, and that Proxy's
  `get` trap does not preserve the correct receiver for accessor properties
  declared on a subclass prototype — a `get platform()` accessor silently
  returns an object whose model delegates (`.tenant`, `.user`, …) are
  `undefined`, which only breaks at runtime (TypeScript sees nothing wrong).
  If you need another "raw client" escape hatch, assign it as a field in
  the constructor the same way, not as a getter.
- Every `create()` call in tenant-scoped services casts its `data` payload
  as `Prisma.<Model>UncheckedCreateInput` — `forTenant()` injects `tenantId`
  into `data` at runtime via a Prisma Client Extension, which the generated
  types have no way to reflect statically. This is a deliberate, repeated
  pattern, not an oversight; keep using it in later phases.
- **`forTenant().$transaction(async (tx) => ...)` does propagate tenant
  scoping into `tx`** — verified empirically, not just assumed. The one
  wrinkle: `tx`'s type is the extended client's own transaction type, not
  the generated `Prisma.TransactionClient` — functions that accept a
  transaction client as a parameter (like `generateSequenceNumber`) need
  `tx as unknown as Prisma.TransactionClient` at the call site, same class
  of cast as the `UncheckedCreateInput` one above.
- **Routes registered under the same prefix are matched in registration
  order, not by specificity** (Nest/Express, not a Prisma quirk). This is
  why part categories live at `/part-categories`, a fully separate path,
  instead of `/parts/categories` — that would risk being shadowed by
  `GET /parts/:id` if `PartsController`'s routes happened to register first.
- Nested-only records — only ever reached via a parent's `:id`, no
  independent top-level list route (`EstimateLineItem`, `JobCardLabour`,
  `PurchaseOrderItem`, `GoodsReceipt(Item)`, `JobCardPart`, `InvoiceLineItem`,
  `Payment`, …) — get a bare `tenantId` scalar column with no
  `tenant Tenant @relation`. Entities with their own top-level CRUD
  controller get the full relation + a back-array on `Tenant`, even if
  they're also linked to something else (`Estimate`, `PurchaseInvoice`,
  `SupplierPayment`, …). `Payment` is the clearest example of this rule
  actually mattering: it's structurally almost identical to
  `SupplierPayment`, but `SupplierPayment` got its own top-level
  `/supplier-payments` controller in Phase 6 (so it's "primary"), while
  `Payment` here is reached only via `POST /invoices/:id/payments` (so it's
  a "child"). This is a schema-hygiene choice about `Tenant` model bloat,
  not a tenant-isolation one — isolation is `TENANT_SCOPED_MODELS` either
  way, independent of whether the relation object exists.
- Cross-module service injection now chains three deep and is still
  one-directional (no cycles): `EstimatesModule` → `JobCardsModule` →
  `InvoicesModule`. Each link exists because the *public entry point*
  naturally lives on the "earlier" resource (convert an estimate; generate
  an invoice from a job card) while the actual creation logic lives with
  the model being created.
- The demo tenant's login is `owner@demoworkshop.test` / `ChangeMe123!` —
  seeded for local development only; never ships to a real deployment.
- Run `npm test` to exercise the tenant-isolation primitive, the permissions
  guard, DTO validation rules, the estimate/GST/payment-status calculation
  logic, the job card and purchase order status pipelines, and the
  sequence-number formatter (139 tests).

## What's deliberately NOT in this phase yet

PDF generation, WhatsApp/print sharing of invoices, Reports, the Dashboard,
and Notifications — these land in Phase 8 per the sequencing in the Phase 1
architecture doc, each building on the transactional data Phases 2–7 now
provide end-to-end.
