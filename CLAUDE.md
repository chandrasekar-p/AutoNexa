# AutoNexa — Project Notes for Claude

Multi-tenant B2B SaaS for automotive workshop management. Two independent
Node apps, no shared workspace tooling — `npm install` inside each one.

```
apps/api/   NestJS backend — REST API, Prisma + PostgreSQL
apps/web/   Next.js 14 (App Router) frontend
```

See [AutoNexa-Phase1-Architecture.md](./AutoNexa-Phase1-Architecture.md) for
the original product spec (ER diagram, permission matrix), and
[README.md](./README.md) for setup/deployment instructions. This file is
about *how the codebase actually works and how to work in it* — conventions
discovered/established across a very long build, not the product spec.

## Backend conventions (`apps/api`)

- **Multi-tenancy**: every tenant-owned Prisma model is scoped through
  `PrismaService.forTenant()` (`src/prisma/prisma.service.ts`), which reads
  the current tenant from `TenantContext` (an `AsyncLocalStorage`, set by
  `TenantGuard` per-request) and auto-injects `where: {tenantId}` /
  `data: {tenantId}`. **Never** query a tenant-owned model with the raw
  `this.prisma` client in a request-scoped path — that bypasses tenant
  isolation entirely. New models with a `tenantId` column must be added to
  the `TENANT_SCOPED_MODELS` set in that file or `forTenant()` silently
  won't scope them.
  - `this.prisma.platform` is the deliberate escape hatch for genuinely
    cross-tenant/system work (tenant provisioning, seeding, background
    cron jobs that have no per-request context) — pass `tenantId` explicitly
    on every query when using it.
- **Permissions**: `@Permissions('resource:action')` guards every mutating
  (and most reading) route. The full resource/action catalogue and each
  default role's grants live in one place:
  `src/modules/roles/default-role-grants.ts` — both `prisma/seed.ts` and
  tenant provisioning read from it. Adding a new resource means updating
  that file, not just decorating a controller.
- **Audit trail**: `@Audit('action.name', 'EntityName')` on a route
  registers it with `AuditLogInterceptor`
  (`src/common/interceptors/audit-log.interceptor.ts`), which writes an
  `AuditLog` row after a successful response. **It reads `result.id` off
  the handler's return value to fill `entityId`** — a handler that returns
  something other than the mutated entity (or omits `id`) will log
  `entityId: "unknown"`. This has bitten real audit trails before; check it
  when adding a new `@Audit()` route.
- **Snapshot pricing**: rates/GST are copied onto line items (labour, parts,
  invoice lines) at add-time and never live-re-read from `Part`/`LabourItem`
  later. Don't "fix" a line item to reflect a current price — that's the
  point.
- **Append-only history**: `JobCardStatusHistory`, `JobCardNote`,
  `InventoryTransaction` are written, never updated/deleted. Job card status
  transitions are validated against an explicit map in
  `job-card-status-transitions.ts` (pure, unit-tested) — don't allow a
  direct status PATCH that skips it.
- **Route ordering**: Nest/Express match routes in registration order and
  this app doesn't use `ParseUUIDPipe`, so a literal route like `GET
  /users/me` must be registered **before** `GET /users/:id` in the
  controller, or `:id` swallows it.
- **Backend tests live in a top-level `test/` directory**, not colocated —
  `jest.config.js`'s `testRegex` only matches `test/*.spec.ts`. They're
  almost entirely **pure-function/DTO tests** (status transitions, GST
  split math, sequence numbers, pick-channels, templates...) — services
  themselves aren't unit-tested with a mocked Prisma client anywhere in
  this codebase. If new business logic needs a test, extract it as a pure
  function first, the way `job-card-status-transitions.ts`,
  `gst-split.ts`, `reminder-window.ts`, etc. already do, rather than adding
  a new testing pattern.
- **Outbound messaging** (`src/modules/messaging/`): `MessagingService`
  dispatches customer-facing Email/SMS/WhatsApp and an internal Slack ops
  ping on business events (appointment confirmed/reminder, estimate ready,
  job card ready, invoice issued, payment received). Every attempt — sent,
  failed, or skipped because a provider isn't configured — is logged to
  `DeliveryLog` (`GET /messaging/deliveries`, gated on `audit-log:read`).
  Provider credentials are platform-level env vars (`SMTP_*`, `TWILIO_*`,
  `WHATSAPP_*`); Slack is the one per-tenant exception
  (`TenantSettings.slackWebhookUrl`). `MessagingService.notifyCustomer`/
  `notifyOps` never throw — a messaging failure must never break the
  business operation that triggered it.

## Frontend conventions (`apps/web`)

- **Design system**: CSS-variable-backed semantic tokens (`bg-canvas`,
  `bg-surface`, `text-ink`, `border-line`, ...) defined in `app/globals.css`
  and swapped via a `.dark` class — write components against the semantic
  tokens, not raw Tailwind colors, so dark mode comes for free. The
  sidebar/topbar chrome is a deliberate exception (fixed `graphite-*` scale
  in both themes, not part of the light/dark surface).
- **`cn()`** (`lib/cn.ts`) uses `tailwind-merge`, not plain string
  concatenation — conflicting utility classes (e.g. a caller's `w-40`
  against a component's own `w-full`) resolve correctly (last one wins).
  Don't revert this to a plain `.join(' ')`; that reintroduces
  nondeterministic class-conflict bugs (this actually happened once this
  session).
- **Auth**: in-memory access token + httpOnly refresh cookie. `usePermission`
  / `useHasResourceAccess` (`lib/hooks/use-permission.ts`) are **UX-only** —
  they hide/show UI, they are never the security boundary. The backend's
  `@Permissions()` guards are the actual boundary; don't skip a backend
  permission check because the frontend already hides the button.
- **Data fetching**: `useApiQuery` (`lib/hooks/use-api-query.ts`) is the
  standard `{data, error, isLoading, refetch}` hook used everywhere — reuse
  it rather than hand-rolling `useEffect`+`useState` fetch logic.
- **Reusable pickers**: `CustomerPicker`, `SupplierPicker`, `PartPicker`,
  `LabourItemPicker` all follow the same search-dropdown pattern — copy one
  of these, don't design a new picker UX.
- **Frontend tests are colocated** (`foo.ts` + `foo.test.ts` next to each
  other), run with Vitest — the opposite convention from the backend's
  top-level `test/` directory. Same "extract pure logic, test that"
  philosophy applies (`lib/export/csv.ts`, `lib/job-card-transitions.ts`,
  `lib/chart-data/fill-daily-sales.ts`, ...).
- **`Input` with `type="password"`** automatically renders a show/hide eye
  toggle (`components/ui/input.tsx`) — don't build a one-off password
  visibility toggle elsewhere, the shared component already handles it for
  every password field in the app.

## Working in this repo

- **Verify before declaring done**: `npx tsc --noEmit` + the relevant test
  suite (`npm test` in each app) + an actual live smoke test against the
  running dev servers. Type-checking and unit tests catch correctness bugs,
  not whether a feature actually works end-to-end — this project has a
  history of live-testing catching real issues (broken DTOs, wrong HTTP
  verbs, missing includes) that `tsc`/tests alone missed.
- **Dev servers**: `apps/api` on `:4000` (`npm run start:dev`, Nest watch
  mode), `apps/web` on `:3000` (`npm run dev`). When starting the API in the
  background, check `lsof -i:4000` first and kill any stale process —
  leftover `nest start --watch` processes (or worse, a stale `dist/main`
  production build) silently serving on the same port has caused real
  confusion in this project's history (an apparent login failure that was
  actually a zombie process, not a code bug).
- **Migrations**: `npm run prisma:migrate` (dev, interactive) vs
  `npm run prisma:deploy` (prod, non-interactive) — see README's deployment
  section. `npm run prisma:seed` creates a demo tenant with a
  publicly-known password; never re-run it against a database with real
  data.
- **Don't leave scratch scripts in the repo**: one-off diagnostic/repair
  scripts (e.g. a Node script to inspect/fix a dev-DB row directly via
  Prisma) belong in a scratch/tmp directory and should be deleted
  immediately after use, not committed or left lying around in `apps/api/`.
