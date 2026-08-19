# AutoNexa API — Phase 2 & 3: Auth/Tenancy/RBAC + Customers/Vehicles

This is the backend built so far: everything every later phase (job cards,
inventory, billing…) will build on top of.

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

## Modules

`auth`, `tenants`, `branches`, `users`, `roles`, `permissions`, `customers`, `vehicles`

## Setup

```bash
cp .env.example .env
# edit .env — at minimum set DATABASE_URL to a real Postgres instance
# and change JWT_ACCESS_SECRET / JWT_REFRESH_SECRET / SUPER_ADMIN_PASSWORD

npm install
npx prisma migrate dev --name phase3_customers_vehicles
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
  `Customer`, `Vehicle`, and `VehicleDocument` to it.
- The demo tenant's login is `owner@demoworkshop.test` / `ChangeMe123!` —
  seeded for local development only; never ships to a real deployment.
- Run `npm test` to exercise the tenant-isolation primitive, the
  permissions guard, and the Phase 3 DTO validation rules (17 tests).

## What's deliberately NOT in this phase yet

Appointments, inspections, estimates, job cards, inventory, billing — these
land in Phases 4–7 per the sequencing in the Phase 1 architecture doc, each
building on the foundation laid in Phases 2–3.

