# AutoNexa

Multi-tenant B2B SaaS for automotive workshop management. See
[AutoNexa-Phase1-Architecture.md](./AutoNexa-Phase1-Architecture.md) for the
full product architecture, ER diagram, Prisma schema design, and role/permission
matrix.

## Status

The full SRS MVP scope (§30) is built: Customers, Vehicles, Appointments,
Inspections, Estimates, Job Cards, Technicians, Parts/Inventory, Suppliers,
Purchases, Invoices/Payments, plus the admin layer (Users, Roles, Audit Log,
Message Deliveries, Workshop Settings, Reports, global Search). Outbound
Email/SMS/WhatsApp/Slack messaging on key business events is also in place,
along with Razorpay payment collection, customer self-service estimate
approval, proactive insurance/PUC/service-due reminders, S3-backed file
storage, AMC/Service Packages + a points-based Loyalty program (§8),
per-line warranty tracking with comeback-claim workflow (§9), and
GST/Tally export for the accountant's monthly filing (§10) — this closes
the original seven-item gap-analysis list.
Deferred, per the SRS's own Phase 2 scope (§31): multi-branch UI, mobile
app, and subscription billing. Accounting integration is addressed as
correct, reconciled export files rather than a live sync — there's no
public real-time API for Tally to integrate against.

## Repo layout

```
apps/
├── api/          NestJS backend (REST API, Prisma + PostgreSQL)
└── web/           Next.js 14 frontend (App Router)
```

Both apps are independent Node projects (no shared workspace tooling) — run
`npm install` inside each one separately.

## Backend — `apps/api`

### Prerequisites

- Node.js 20+
- PostgreSQL (see `DATABASE_URL` in `.env`)

### Setup

```bash
cd apps/api
npm install
cp .env.example .env   # then fill in real secrets/DB credentials
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

The API listens on `:4000` by default; Swagger docs are served at `/api/docs`.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run the API in watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build (`dist/main`) |
| `npm run prisma:migrate` | Apply local dev migrations |
| `npm run prisma:deploy` | Apply migrations in production (no schema drift prompts) |
| `npm run prisma:seed` | Seed permission catalogue, Super Admin, and a demo tenant |
| `npm run lint` | Lint `src/` |
| `npm run test` | Run Jest tests |

## Frontend — `apps/web`

### Prerequisites

- Node.js 20+
- A running instance of `apps/api` (see above)

### Setup

```bash
cd apps/web
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local
npm run dev
```

The app listens on `:3000` by default and expects the API from
`NEXT_PUBLIC_API_URL`.

### Useful scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Run the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | Lint the app |
| `npm run test` | Run Vitest tests |

## Environment variables

### `apps/api/.env`

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | no (default `4000`) | HTTP port |
| `NODE_ENV` | recommended | `production` enables the `secure` flag on the refresh-token cookie |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES_IN` | yes | Access token signing |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | yes | Refresh token signing (httpOnly cookie) |
| `CORS_ORIGIN` | recommended in prod | Comma-separated allowed origins for the frontend; unset allows any origin |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | yes (for seeding) | Platform Super Admin account created by `prisma:seed` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | no | Outbound email — unset skips email delivery (logged as `SKIPPED`, not an error). Plain SMTP under the hood, so any provider works: Gmail SMTP, SendGrid, Postmark, or Brevo (`SMTP_HOST=smtp-relay.brevo.com`, port `587`, login = your Brevo account email, password = an SMTP key from Brevo's dashboard under SMTP & API) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | no | Outbound SMS via Twilio — unset skips SMS |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | no | Outbound WhatsApp via Meta's Cloud API — unset skips WhatsApp |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no | Razorpay API key pair — unset hides/disables "Send Payment Link" on an invoice, same "quietly unavailable" posture as the messaging providers above |
| `RAZORPAY_WEBHOOK_SECRET` | no (required if the above are set) | Verifies the HMAC signature Razorpay sends on every webhook delivery — configure it in the Razorpay dashboard's webhook settings to match |
| `FRONTEND_URL` | recommended | Where a customer-facing link should point the browser — Razorpay's Payment Link `callback_url` after paying, and the estimate self-approval link (`{FRONTEND_URL}/estimates/approve/:token}`). Unset: the Razorpay redirect is just skipped (Razorpay shows its own confirmation page instead), but the estimate approval link becomes a relative path with no host — only actually usable once a real `FRONTEND_URL` is set, so treat this as required in practice once either feature is in use |
| `ESTIMATE_APPROVAL_SECRET` | **yes**, once this feature is deployed | Signs/verifies the customer estimate-approval link's token — a dedicated secret, not shared with `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` or `RAZORPAY_WEBHOOK_SECRET`. Unlike the messaging/Razorpay providers, this one is **not** optional-with-graceful-degradation: `EstimatesService.send()` (the pre-existing "send to customer" action) now mints a token on every call, so an unset secret breaks `send()` outright, not just a new feature — set it before deploying this phase |
| `STORAGE_MODE` | no (default `local`) | `local` writes to `apps/api/uploads/`; `s3` uses the S3-compatible provider configured below |
| `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | **yes** if `STORAGE_MODE=s3` | Bucket + credentials — unlike the messaging providers, a missing var here **fails the app at startup**, not a quiet degradation (see §4 below) |
| `S3_ENDPOINT` | no | Set for Cloudflare R2/MinIO/any non-AWS S3-compatible provider; unset uses AWS's own endpoint resolution |

Slack is configured per-workshop, not via `.env` — each tenant sets its own
incoming webhook URL under Settings → Workshop → Slack Webhook URL.
Razorpay is platform-level like SMTP/Twilio/WhatsApp above, not
per-tenant — one shared merchant account across every workshop on this
deployment.

### `apps/web/.env.local`

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Base URL of `apps/api`, e.g. `https://api.yourdomain.com` |

## Deployment

There's no bundled Docker/IaC setup — both apps are plain Node processes.
The steps below are the same regardless of host (a VM, a container you build
yourself, or a PaaS that runs `npm run build && npm run start`).

### 1. Database

Provision PostgreSQL, then apply migrations with the **non-interactive**
command (never `prisma:migrate` in production — that one's for local dev and
will prompt):

```bash
cd apps/api
npm run prisma:deploy
```

Run `npm run prisma:seed` once against a fresh database if you want the
permission catalogue and a Super Admin account created. **Do not re-run it
against a database with real tenant data** — it also creates a demo tenant
(`demo-workshop`) with a publicly-known password (`ChangeMe123!` — see the
README's own seeded-accounts table below). If you seed a database that will
ever be internet-facing, delete or repassword that demo tenant afterward.

### 2. API (`apps/api`)

```bash
npm install
npm run build
npm run start:prod
```

Set `NODE_ENV=production` so the refresh-token cookie gets `secure: true`
(HTTPS-only). Put it behind a reverse proxy (nginx, Caddy, your platform's
built-in one) that terminates TLS and forwards to `:4000` (or whatever
`PORT` you set).

Set `CORS_ORIGIN` to the frontend's exact origin(s). The refresh cookie uses
`SameSite=Lax`, which is sent on cross-subdomain requests but not on
requests from an entirely different registrable domain — so deploy the
frontend and API as subdomains of the same domain (e.g. `app.example.com`
and `api.example.com`), not unrelated domains.

**File uploads** (workshop logos, inspection photos, vehicle photos, vehicle
documents) go through `StorageService` — `STORAGE_MODE=local` (the default)
writes to `apps/api/uploads/`, fine for local dev but not for any host with
an ephemeral or non-shared filesystem (most container platforms,
multi-instance deployments), since uploads won't survive a redeploy or be
visible from a second instance. Set `STORAGE_MODE=s3` before relying on
this in production — see §4 below.

### 3. Web (`apps/web`)

```bash
npm install
npm run build
npm run start
```

Set `NEXT_PUBLIC_API_URL` to the API's public URL at build time (it's
inlined into the client bundle, so it must be set before `npm run build`,
not just at runtime). Put this behind the same reverse-proxy/TLS setup as
the API, on a subdomain of the same registrable domain (see the cookie note
above).

### 4. Object Storage (S3-compatible)

`STORAGE_MODE` defaults to `local` (writes to `apps/api/uploads/`, the
right fit for local dev and single-server pilots). For anything with an
ephemeral or multi-instance filesystem, switch to S3-compatible object
storage — AWS S3, Cloudflare R2, MinIO, or any other S3-API-compatible
provider:

1. Create a bucket. **Do not** make it public-read or public-write — every
   file is served through a signed, time-limited URL generated on demand
   (15 minutes), never a public bucket URL.
2. Set `STORAGE_MODE=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY` (see the env var table above). Set `S3_ENDPOINT`
   too if you're on R2/MinIO/anything other than AWS itself — unset uses
   AWS's own endpoint resolution.
3. Restart the API. If any required `S3_*` var is missing while
   `STORAGE_MODE=s3`, the app **fails to start** rather than silently
   falling back to local disk — a storage misconfiguration should be loud,
   not a redeploy that quietly starts writing to a container's ephemeral
   disk again.

**Already have files in `apps/api/uploads/` from running in local mode?**
Run the one-off migration once, after switching to S3 for real:

```bash
npm run migrate:uploads-to-s3 -- --dry-run   # prints what it would do, changes nothing
npm run migrate:uploads-to-s3                # uploads each file to the bucket, rewrites the DB row
```

Safe to run twice — a row already migrated no longer matches the old
local-disk path shape, so a second run finds nothing left to do for it.
Not wired into any deploy/start hook; it's a manual, one-time cutover step.

**What doesn't need to change**: the frontend already resolves whatever
`GET`/`POST` responses hand it (`lib/uploads.ts`'s `resolveUploadUrl`
passes an absolute URL straight through) — no frontend code cares which
`STORAGE_MODE` the API is running in.

### 5. Payment Gateway (Razorpay) — optional

1. Create a Razorpay account (or use an existing one) and grab the API
   key pair from Settings → API Keys — set `RAZORPAY_KEY_ID` /
   `RAZORPAY_KEY_SECRET`.
2. In Razorpay's dashboard, Settings → Webhooks → add a webhook pointing
   at `https://<your-api-domain>/api/v1/payments/webhooks/razorpay`
   (must be a real, publicly reachable HTTPS URL — Razorpay calls this
   directly, it can't reach `localhost` or an internal address). Enable
   at minimum the `payment_link.paid`, `payment_link.expired`,
   `payment_link.cancelled`, and `payment.failed` events.
3. Razorpay shows the webhook secret once, at creation — set it as
   `RAZORPAY_WEBHOOK_SECRET`. If you ever need to rotate it, update both
   sides (Razorpay's dashboard and this env var) together — a mismatch
   fails every webhook's signature check silently (logged to
   `payment_gateway_events` with `signatureValid: false`, not a 500).
4. Optionally set `FRONTEND_URL` so a customer lands back on the invoice
   page after paying, instead of Razorpay's own generic confirmation page.
5. Restart the API so the new env vars take effect.

Until this is configured, "Send Payment Link" simply doesn't appear/errors
clearly (`payment gateway is not configured`) — nothing else in the app
depends on it.

### 6. Customer Communication — self-service estimate approval

Set `ESTIMATE_APPROVAL_SECRET` (a long random string — treat it like a JWT
signing secret, because it is one) and `FRONTEND_URL` (see the env var
table above). Once both are set, `POST /estimates/:id/send` automatically
includes an approval link in the customer's WhatsApp/SMS/Email —
`{FRONTEND_URL}/estimates/approve/:token` — no other configuration needed;
this doesn't call out to a third-party API the way Razorpay does.

The link:

- Lets the customer view the estimate (line items, total, job description)
  and tap Approve/Reject with **no login**.
- Is a signed, time-limited token — **7 days** by default — not a row
  looked up in the database. If it expires (or the customer lost the
  message), staff click **Resend Approval Link** on the estimate detail
  page (visible whenever status is still `SENT`) to mint a fresh one and
  re-send — this never changes the estimate's status, only the delivery.
- Can only ever be used **once**: approving or rejecting moves the
  estimate out of `SENT`, and a second click of the same (or a resent)
  link is rejected the same way a staff member double-clicking Approve
  would be.
- Every open, approval, rejection, and failed/expired attempt is logged to
  `estimate_approval_events` — a defensible record of what the customer
  (or whoever had the link) actually did, separate from the normal staff
  audit log.

Staff's existing "Mark Approved"/"Mark Rejected" buttons (for phone-based
approvals) are unaffected — both paths update the same estimate through
the same guard, just tagged with who made the call.

### 7. Customer Reminders — insurance/PUC expiry, next-service-due

No new env vars — this rides on the same Email/SMS/WhatsApp providers as
every other customer message, and the same daily 08:00 server-time cron
(`ReminderCronService`) that already sends appointment reminders. Three new
checks run alongside it:

- **Insurance expiry** and **PUC expiry** — reuses `Vehicle.insuranceExpiry`
  /`pucExpiry`, the same fields the internal dashboard's "Needs Attention"
  alerts already read; this phase adds an outbound message on top, it
  doesn't change that internal view.
- **Next-service-due** — computed from the vehicle's most recent delivered
  job card (`actualDelivery` date + `odometer` reading at that service)
  against a service interval, either the tenant's default or a per-vehicle
  override. Fires by whichever comes first: `serviceIntervalMonths` after
  the last service, or `serviceIntervalKm` since the last recorded
  odometer reading — the odometer trigger only works if
  `Vehicle.odometerReading` is kept reasonably current, since nothing in
  this app updates it automatically from job cards.

Each reminder fires once per **threshold crossing** (default 30/15/7 days
out, shared across all three date-based checks), not once per day —
tracked via `DeliveryLog.dedupeKey`, so a renewed policy or a newly
completed service naturally resets the cycle rather than being suppressed
forever.

Configure from **Settings → Customer Reminders**: toggle each reminder type
on/off, edit the day-thresholds, and set the default service interval. A
customer can opt out of all three (but not transactional messages —
invoices, payments, appointments) from their own record's "Opt out of
proactive reminders" checkbox.

### 8. AMC / Service Packages + Loyalty Program

No new env vars — everything is DB-driven via `TenantSettings`, same
posture as the reminder toggles from §7.

**Service Packages (AMC)**: a `ServicePackage` is the tenant-defined
catalogue template (name, price, GST rate, validity, optional visit limit,
and which `LabourItem`s/`Part`s/`PartCategory`s it covers for free). Selling
one (`POST /customer-service-packages`) creates a `CustomerServicePackage`
tied to a specific customer+vehicle **and** the standalone invoice that
paid for it, atomically — same "never a phantom invoice" guarantee as
every other invoice-generating action in this app.

Redeeming a package: link a job card to it via `redeemedPackageId`
(create-time or update). Any labour/part added to that job card that
matches the package's included-items list is automatically excluded from
the eventual invoice (covered "for free" — no re-charge, no incremental
GST, since GST was already paid in full when the package itself was
sold); anything outside the package's coverage bills normally. The
package's visit counter increments once per job card, at the DELIVERED
transition — not per line item, and not at invoice time.

Renewal (`POST /customer-service-packages/:id/renew`) is a manual staff
action that creates a new package + new invoice — no separate Razorpay
integration needed, the resulting invoice gets the same "Send Payment
Link" button as any other invoice. `ReminderCronService` sends an
expiring-soon notice (reusing the exact reminder-threshold/dedup
mechanics from §7) but never auto-renews or auto-charges.

**Loyalty**: customers earn points (`TenantSettings.loyaltyPointsPerRupee`,
default 1 point per ₹100) on an invoice's pre-tax subtotal once it's fully
paid — not at generation. Points redeem
(`TenantSettings.loyaltyPointValueRupees`, default 1 point = ₹1) as a
**pre-tax** discount on a future invoice
(`POST /job-cards/:id/generate-invoice` with `{"redeemLoyaltyPoints": N}`)
— it reduces the taxable value before GST is computed, not a post-tax
subtraction, so GST payable actually goes down. Every earn/redeem/manual
correction is recorded in the append-only `LoyaltyTransaction` ledger;
`Customer.loyaltyPointsBalance` is a guarded running-total cache kept in
sync with it, same "mutable cache next to an append-only ledger" pattern
`Part.currentStock`/`InventoryTransaction` already use. Manual corrections
(goodwill points, fixing an error) go through `POST /loyalty/adjust`,
gated on `loyalty:update`.

Configure both from **Settings** (thresholds/toggles) — no dedicated UI
was built for this phase beyond the API; see the reports below for
visibility in the meantime.

**Reports**: `GET /reports/packages-summary` (active/expiring-soon/
expired/cancelled counts + a paginated list) and
`GET /reports/loyalty-liability` (total outstanding points across every
customer, converted to rupees at the current redemption rate — i.e. the
discount exposure if every point were redeemed tomorrow).

**Upgrading an existing deployment**: adding `service-package`/`loyalty`
as new permission resources doesn't retroactively grant them to
already-provisioned tenants' roles (only a fresh `prisma:seed` or a
brand-new tenant picks up `default-role-grants.ts` automatically). Run
once after deploying this phase:

```bash
npm run backfill:role-permissions -- --dry-run   # prints what would change
npm run backfill:role-permissions                # actually grants them
```

Safe to run more than once — every grant is upsert/skip-if-exists, and it
only touches roles whose name matches a known default (Workshop Owner,
Workshop Manager, ...), never a tenant's own custom-named roles.

### 9. Warranty Tracking & Comeback Claims

No new env vars. `Part`/`LabourItem` gained a `warrantyPeriodMonths`
(both) and `warrantyKm` (`Part` only — a labour warranty isn't naturally
mileage-bound) template field — set them from the Parts/Labour Items
pages. Every time one is added to a job card, its warranty term is
**snapshotted** onto the `JobCardPart`/`JobCardLabour` row, same
discipline as the price/GST snapshot already used everywhere else in this
app — editing a Part's warranty later never changes coverage on a job
already done.

**Coverage is computed, never stored**: `GET /vehicles/:id/warranty-status`
shows every past labour/part line on a vehicle with its live active/expired
status (whichever comes first — date or km), useful at intake to check "is
this brake job still covered?" before diagnosing a comeback.

**Raising and resolving a claim**:

1. Create a new job card for the comeback visit, exactly like any other
   visit — `job-card-status-transitions.ts` is completely unchanged, a
   comeback isn't a special job-card type.
2. `POST /warranty-claims` with `claimJobCardId` + exactly one of
   `originalJobCardPartId`/`originalJobCardLabourId` — rejected outright
   if that original line's warranty has already expired. Gated on
   `warranty-claim:create` (Technician and Service Advisor both have this
   by default — anyone doing intake can flag a suspected comeback).
3. Add the actual fix to the comeback job card via the normal
   `POST /job-cards/:id/labour`/`/parts` endpoints, with an added optional
   `warrantyClaimId` tagging which open claim (on that same job card) this
   line resolves.
4. A manager reviews and decides: `PATCH /warranty-claims/:id` with
   `status: "APPROVED"` (or `"REJECTED"`) and `isBillable`. Gated on
   `warranty-claim:update` — Technician/Service Advisor can raise a claim
   but not approve their own. Approved-and-free lines are excluded from
   the eventual invoice entirely (same "excluded, not zeroed" treatment
   AMC package coverage already uses) — zero incremental GST, since a
   warranty fix isn't a new sale.

**Reports**: `GET /reports/warranty-liability` (cost exposure if every
currently-covered part/labour line came back as a valid claim tomorrow —
parts at purchase price, labour at full snapshotted value, same "no
per-technician cost data" caveat the profit-margin report already
documents), `GET /reports/warranty-claims-summary` (counts by status +
list), and `GET /reports/comeback-rate?groupBy=technician|part|supplier`
(raw counts, not a computed percentage). The `supplier` grouping uses each
part's configured *preferred* supplier — this system has no lot/batch
tracking, so it can't trace a specific defective unit back to the exact
purchase invoice that brought it in; a documented approximation, not exact
traceability.

**Not built in this phase, deliberately**: any supplier-side chargeback/
recovery workflow — this phase only surfaces the data (comeback rate by
supplier) needed to decide when that's warranted.

**`Vehicle.warrantyInfo`** is unchanged and untouched — it's the vehicle's
own *manufacturer* warranty (free text, e.g. "3 years bumper-to-bumper"),
a different concept from the workshop's own repair warranty this phase
tracks. Nothing to migrate; they don't overlap.

**Upgrading an existing deployment**: `warranty-claim` is a new permission
resource — run the same backfill from §8 again after deploying this phase
(it's idempotent, safe to re-run for any past or future addition to
`default-role-grants.ts`):

```bash
npm run backfill:role-permissions
```

### 10. GST Export & Tally-Ready Vouchers

No new env vars. This doesn't integrate live with Tally (there's no public
real-time API for that) — it builds correct, reconciled export files an
accountant imports or works from directly, closing the last item on the
original gap-analysis list.

```
GET /reports/export/gst?from=&to=&format=tally-xml|gstr-csv&side=sales|purchases
```

Gated on its own `gst-export:read` permission — deliberately **not** the
existing `report:read` (also granted to Service Advisor/Inventory Manager,
too broad for a raw financial export with customer GSTINs). Only Workshop
Owner/Manager and Accountant have it by default.

- `side=sales` (Invoice/InvoiceLineItem/Payment) is high-fidelity: GST is
  already split into CGST/SGST/IGST per invoice, and `format=gstr-csv`
  re-derives it per rate/HSN bucket via the same `calculateGstSplit()`
  invoices were generated with, so a GSTR-1 row can never disagree with
  how the invoice itself was taxed. `format=tally-xml` produces Sales +
  Receipt vouchers.
- `side=purchases` (PurchaseInvoice/SupplierPayment) is **approximate,
  by design** — `PurchaseInvoice` has no HSN-wise or CGST/SGST/IGST
  breakdown (no line items, no `Supplier.state`), so tax is shown as one
  blended amount, split evenly into CGST+SGST assuming an in-state
  supplier. Correct for GSTR-3B's aggregate ITC total; not accurate
  per-tax-head for an inter-state supplier. `format=tally-xml` produces
  Purchase + Payment vouchers. Every export response's `warnings` array
  says this explicitly — it's not buried in this file.
- Add `&preview=true` to get JSON totals/warnings back instead of a file
  download, and to check for amendments, without creating an export batch.
- A line item with no HSN/SAC code (true of every Part/LabourItem seeded
  before this phase) groups under an explicit `"UNSPECIFIED"` bucket
  rather than being dropped or blocking the export — the response's
  `warnings` array says how many lines are affected.
- **Reconciliation**: the sales export and `GET /reports/gst-summary`
  fetch invoices with the identical date-range filter and reduce them
  through the same `summarizeInvoiceGst()` — they cannot disagree on the
  same period.
- **Idempotent re-export**: re-requesting an unchanged period (same
  `side`, exact same `from`/`to`) reattaches to the SAME batch number
  (`X-Export-Batch-Number` header) instead of minting a new one — repeat
  downloads of a file you already have don't produce a second,
  indistinguishable batch. A genuinely changed manifest (only possible on
  the purchase side today — sales `Invoice` rows have no edit path at
  all) mints a new batch and both the response's `amended` array and a
  `warnings` entry flag exactly which voucher changed and by how much,
  rather than silently blending the correction into an unflagged number.

### 11. Smoke-test before declaring it live

- `POST /auth/login` against the deployed API with a real account
- Confirm the frontend can reach it (no CORS errors in the browser console)
- Upload a file (e.g. a workshop logo) and confirm it's fetchable back
- If `STORAGE_MODE=s3`: confirm the uploaded file actually landed in the
  bucket (not `apps/api/uploads/`), and that the URL the app loads it from
  is a signed S3 URL (has a query string with `X-Amz-Signature` or
  similar), not a bare `/uploads/...` path
- If messaging env vars are set, trigger one event (e.g. book an appointment)
  and check `/deliveries` in the app for a `SENT` row, not `FAILED`
- If Razorpay env vars are set: click "Send Payment Link" on an invoice
  with an outstanding balance, pay it via Razorpay's test mode, and
  confirm the invoice flips to `PAID` (or `PARTIALLY_PAID`) within a few
  seconds without any manual action — that's the webhook round-trip
  working end-to-end. Check `payment_gateway_events` in the database if it
  doesn't; every delivery Razorpay makes is logged there, processed or not
- Send an estimate to a test customer, open the approval link it produces
  in an incognito window (no session), and confirm you can approve it and
  that a second click of the same link is rejected as already-decided
- Set a test vehicle's insurance/PUC expiry a few days inside your
  configured threshold, run/wait for the reminder cron, and confirm a
  `vehicle.insurance-expiring` (or `.puc-expiring`) row appears in
  `/deliveries` with a `dedupeKey` set — then confirm running the cron
  again the same day does **not** produce a second row for that vehicle
- Sell a service package to a test customer+vehicle, confirm the sale
  produced exactly one invoice; redeem it on a job card, add a covered and
  an uncovered line, delivered it, generate the invoice, and confirm only
  the uncovered line is billed and the package's `visitsUsed` incremented
  by exactly 1
- Pay an invoice in full and confirm the customer's loyalty balance
  increased in `GET /loyalty/transactions`; redeem points on a later
  invoice and confirm its GST is computed on the discounted (not full)
  subtotal
- Hit `GET /reports/export/gst?...&side=sales&format=gstr-csv` and
  `GET /reports/gst-summary` for the identical `from`/`to` and confirm the
  totals match exactly; download `format=tally-xml` for the same period
  and confirm the `X-Export-Batch-Number` header is the SAME batch number
  as the CSV download (idempotent re-export, no new batch minted); edit a
  purchase invoice's total, re-export `side=purchases`, and confirm the
  changed invoice appears in the response's `amended` array with its old
  and new amounts, and that a new batch number is issued for that period

## Seeded accounts (local dev only)

| Role | Email | Password |
|---|---|---|
| Super Admin | value of `SUPER_ADMIN_EMAIL` | value of `SUPER_ADMIN_PASSWORD` |
| Demo Workshop Owner | `owner@demoworkshop.test` | `ChangeMe123!` |

These credentials are public (they're in this file). Never leave the demo
account active on a production database — see the seeding warning above.
