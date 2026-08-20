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
Email/SMS/WhatsApp/Slack messaging on key business events is also in place.
Deferred, per the SRS's own Phase 2 scope (§31): customer self-service
portal, multi-branch UI, mobile app, subscription billing, and accounting
integration.

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
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | no | Outbound email — unset skips email delivery (logged as `SKIPPED`, not an error) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | no | Outbound SMS via Twilio — unset skips SMS |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | no | Outbound WhatsApp via Meta's Cloud API — unset skips WhatsApp |

Slack is configured per-workshop, not via `.env` — each tenant sets its own
incoming webhook URL under Settings → Workshop → Slack Webhook URL.

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

**File uploads** (workshop logos, inspection photos) are written to local
disk (`apps/api/uploads/`), not object storage. On any host with an
ephemeral or non-shared filesystem — most container platforms, multi-instance
deployments — this means uploads won't survive a redeploy or won't be visible
from a second instance. Mount a persistent volume at `apps/api/uploads` (or
plan to move `src/modules/uploads` to S3-compatible storage) before relying
on this in production.

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

### 4. Smoke-test before declaring it live

- `POST /auth/login` against the deployed API with a real account
- Confirm the frontend can reach it (no CORS errors in the browser console)
- Upload a file (e.g. a workshop logo) and confirm it's fetchable back
- If messaging env vars are set, trigger one event (e.g. book an appointment)
  and check `/deliveries` in the app for a `SENT` row, not `FAILED`

## Seeded accounts (local dev only)

| Role | Email | Password |
|---|---|---|
| Super Admin | value of `SUPER_ADMIN_EMAIL` | value of `SUPER_ADMIN_PASSWORD` |
| Demo Workshop Owner | `owner@demoworkshop.test` | `ChangeMe123!` |

These credentials are public (they're in this file). Never leave the demo
account active on a production database — see the seeding warning above.
