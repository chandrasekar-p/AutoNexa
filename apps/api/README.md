# AutoNexa API — Phases 2–5: Auth/Tenancy/RBAC + CRM + Front-of-House + Operational Core

This is the backend built so far: everything every later phase (inventory,
billing…) will build on top of.

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
  delete. `GET /customers/:id` returns the customer's vehicles inline —
  invoices/estimates/job cards/outstanding balance get added to that same
  response shape as Phases 4–7 land, per the Phase 1 customer-profile spec.
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
  function, never trusts a client-supplied total). `POST /estimates/:id/approve`
  and `.../reject` only succeed from `SENT` status.
  > **Known gap (pre-existing, not fixed in Phase 5):** there is no endpoint
  > that moves an Estimate from `DRAFT` to `SENT`, so `approve`/`reject`/
  > `convert-to-job-card` are only reachable today by editing the DB
  > directly. Worth a small Phase 6-or-earlier fix (e.g. `POST /estimates/:id/send`).

## What's in Phase 5 (operational core)

- **Labour Catalogue** (`labour-items`) — full CRUD, soft delete, standard
  hours/rate/GST per labour item.
- **Technicians** — a technician profile wraps an existing `User` (one
  technician per user, enforced at creation with a clean `409` if the user's
  already a technician, not a raw DB constraint error). No delete endpoint —
  `Technician` has no `deletedAt`; deactivation goes through `status`
  (`ACTIVE`/`ON_LEAVE`/`INACTIVE`) via the normal `PATCH`. `GET /technicians/:id`
  returns the stored profile plus computed workload — `jobsOpen`,
  `jobsCompleted`, `totalLabourHours` — derived from `JobCard`/`JobCardLabour`
  on every read, never stored redundantly. `revenueGenerated` is a commented
  TODO for Phase 7 (Invoicing), where there's finally paid-invoice data to sum.
- **Job Cards** — the operational core:
  - **Numbering**: `{tenantId, "JOB_CARD"}` atomically incremented against
    `TenantSequence` inside the same transaction as the `JobCard` insert, so a
    rolled-back create also rolls back the increment. Formatted as
    `{TenantSettings.jobCardPrefix}-{number padded to 4 digits}`, e.g.
    `JC-0001`. The increment+format logic lives in
    `common/sequence/generate-sequence-number.ts` specifically so
    Invoices/Estimates can reuse it once they need their own numbering.
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
    line into a `JobCardLabour` row (best-effort catalogue match by exact
    description; falls back to the estimate line's own rate if no match —
    see the comment on `JobCardLabour.labourItemId`, which is nullable for
    exactly this reason), skips `PART`/`CONSUMABLE` lines with a comment
    (Phase 6, once `JobCardPart` exists), and only then flips the Estimate to
    `CONVERTED`.

## Modules

`auth`, `tenants`, `branches`, `users`, `roles`, `permissions`, `customers`,
`vehicles`, `appointments`, `inspections`, `estimates`, `labour-items`,
`technicians`, `job-cards`

## Setup

```bash
cp .env.example .env
# edit .env — at minimum set DATABASE_URL to a real Postgres instance
# and change JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / SUPER_ADMIN_PASSWORD

npm install
npx prisma migrate dev --name phase5_labour_technicians_job_cards
npm run prisma:seed
npm run start:dev
```

API docs: `http://localhost:4000/api/docs`

## Try it

```bash
# Log in as the seeded demo Workshop Owner
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"demo-workshop","email":"owner@demoworkshop.test","password":"ChangeMe123!"}'

# Use the returned accessToken
curl http://localhost:4000/customers \
  -H "Authorization: Bearer <accessToken>"

# The seed script also creates one demo customer (Arun Prakash) with one
# vehicle (BMW X5, TN 37 AB 1234) so list/detail endpoints return real data
# immediately.
curl http://localhost:4000/vehicles \
  -H "Authorization: Bearer <accessToken>"

# Create a walk-in job card — jobCardNumber comes back server-generated
# ("JC-0001", ...), status starts OPEN with its first status-history row.
curl -X POST http://localhost:4000/job-cards \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{
        "vehicleId": "<vehicleId>",
        "customerId": "<customerId>",
        "complaint": "Noise from front wheel"
      }'

# Walk the status pipeline — invalid transitions (e.g. skipping stages) 400.
curl -X PATCH http://localhost:4000/job-cards/<jobCardId>/status \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"status": "DIAGNOSIS"}'
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
  `JobCardLabour`, `JobCardStatusHistory`, and `JobCardNote`.
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
  scoping into `tx`** — verified empirically, not just assumed (see
  `job-cards.service.ts`'s numbering transaction). The one wrinkle: `tx`'s
  type is the extended client's own transaction type, not the generated
  `Prisma.TransactionClient` — functions that accept a transaction client as
  a parameter (like `generateSequenceNumber`) need `tx as unknown as
  Prisma.TransactionClient` at the call site, same class of cast as the
  `UncheckedCreateInput` one above.
- The demo tenant's login is `owner@demoworkshop.test` / `ChangeMe123!` —
  seeded for local development only; never ships to a real deployment.
- Run `npm test` to exercise the tenant-isolation primitive, the permissions
  guard, DTO validation rules, the estimate total calculation logic, the job
  card status-transition map, and the sequence-number formatter (72 tests).

## What's deliberately NOT in this phase yet

Parts, inventory, suppliers, purchases, invoices, payments — these land in
Phases 6–7 per the sequencing in the Phase 1 architecture doc. `JobCardPart`
does not exist yet; the `JobCard` model has a comment marking where it goes.
Estimate `PART`/`CONSUMABLE` lines are skipped (not dropped — the estimate
itself remains the record) when converting to a job card, for the same
reason.
