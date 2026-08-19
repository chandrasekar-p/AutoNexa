# AutoNexa

Multi-tenant B2B SaaS for automotive workshop management. See
[AutoNexa-Phase1-Architecture.md](./AutoNexa-Phase1-Architecture.md) for the
full product architecture, ER diagram, Prisma schema design, and role/permission
matrix.

## Status

Phase 2 in progress: Auth, Tenants, Branches, Users, Roles, Permissions.

## Repo layout

```
apps/
└── api/          NestJS backend (REST API, Prisma + PostgreSQL)
```

`apps/web` (Next.js frontend) is not scaffolded yet.

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
| `npm run prisma:migrate` | Apply local dev migrations |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:seed` | Seed permission catalogue, Super Admin, and a demo tenant |
| `npm run lint` | Lint `src/` |
| `npm run test` | Run Jest tests |

### Seeded accounts (local dev only)

| Role | Email | Password |
|---|---|---|
| Super Admin | value of `SUPER_ADMIN_EMAIL` | value of `SUPER_ADMIN_PASSWORD` |
| Demo Workshop Owner | `owner@demoworkshop.test` | `ChangeMe123!` |
