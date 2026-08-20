# AutoNexa — Web (Frontend, Phase 1: Foundation)

Next.js 14 (App Router) + TypeScript (strict) + Tailwind CSS frontend for AutoNexa,
sitting on top of the NestJS API in `apps/api`. This phase builds the foundation
only: login, the dashboard shell (sidebar/topbar), and a real dashboard screen.
Every other module (Customers, Vehicles, Job Cards, ...) is scaffolded as a nav
entry and a placeholder route, to be built out module-by-module in later phases.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then edit if your API isn't on :4000
npm run dev
```

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL of the NestJS API (e.g. `http://localhost:4000`). This is a `NEXT_PUBLIC_` variable, so it's baked into the client bundle at build time and must be reachable **from the browser**, not just from the server — same-origin or CORS-enabled on the API side. The API's `CORS_ORIGIN` env var must include this app's origin, and CORS must be configured with `credentials: true` since the refresh flow relies on a cookie. |

### Scripts

- `npm run dev` — dev server
- `npm run build` — production build (also runs Next's type-check and lint pass)
- `npx tsc --noEmit` — standalone type-check
- `npm test` — Vitest unit tests (run once, not watch mode)

## Auth & token-refresh architecture

This is the part most worth understanding before touching anything in `lib/`.

**The access token lives in memory only** — a module-level variable in
`lib/api-client.ts` — never in `localStorage`/`sessionStorage`. That's a
deliberate XSS mitigation: a token in Web Storage is readable by any script
that gets injected onto the page; a token that exists only in a JS variable
is gone the moment the tab is closed or reloaded, and isn't reachable via
`document.cookie` either. The tradeoff is that a hard reload loses the token,
which is why every page load runs a **silent refresh** on mount (see below).

**The refresh token is an httpOnly cookie** (`autonexa_refresh_token`,
scoped to path `/auth` by the API — see `apps/api/src/modules/auth/auth.controller.ts`).
The frontend never reads or stores it directly; it's invisible to JS by
design. Every request to the API is made with `credentials: 'include'` so
the browser attaches it automatically on same-origin/CORS-with-credentials
requests.

**`AuthProvider`** (`lib/auth/auth-context.tsx`) holds `{ user, accessToken,
isLoading }` in React context:

- On mount, it calls `POST /auth/refresh` once. If the refresh cookie is
  still valid, this returns a fresh access token with no re-login required —
  this is what makes a page reload not force the user back to `/login`.
  `isLoading` is `true` until this resolves; the dashboard layout renders
  nothing (a loading state) until it's settled, so there's no flash of
  unauthenticated content.
- `login(tenantSlug, email, password)` calls `POST /auth/login`. On success
  it stores the returned token + user in context; the caller (the login
  page) navigates to `/dashboard`.
- `logout()` calls `POST /auth/logout` (which revokes the refresh token
  server-side and clears the cookie), then clears context and navigates to
  `/login`.

**`lib/api-client.ts`** is the piece that actually attaches the token and
handles expiry mid-session, and it's split deliberately into two halves:

1. `lib/refresh-decision.ts` exports a pure function, `decideOn401()`, that
   answers "given this response status, this request path, and whether a
   refresh is already in flight, what should happen next?" with no side
   effects — it doesn't fetch anything, it just returns a decision. This
   mirrors the backend's own convention of extracting pure decision logic
   (e.g. `job-card-status-transitions.ts`) so the trickiest logic is
   unit-testable without mocking `fetch` at all.
2. `api-client.ts` is the orchestration shell around that decision: it
   attaches `Authorization: Bearer <token>`, and on a 401 it triggers a
   refresh-and-retry — **exactly once**. If the retried request also 401s,
   it gives up rather than looping.

The one genuinely subtle bug this design has to avoid: if five requests
fire concurrently and the token has expired, all five see a 401 at roughly
the same time. A naive implementation fires five separate `POST
/auth/refresh` calls. `api-client.ts` guards against that with a
module-level `refreshPromise` singleton — the first 401 starts the refresh
and stores the in-flight promise; every other concurrent caller awaits that
same promise instead of starting its own; once it settles (success or
failure), the singleton resets to `null` so the *next* independent 401
(e.g. minutes later) correctly starts a new refresh cycle rather than
reusing stale state. `lib/api-client.test.ts` covers this directly — a
5-concurrent-401 stampede asserts exactly one `/auth/refresh` call, and a
separate test proves the singleton doesn't get "stuck" by forcing a second,
later, independent refresh cycle.

If the refresh call itself 401s (refresh token invalid/revoked/expired),
`api-client.ts` clears the in-memory token and calls the unauthorized
handler registered by `AuthProvider`, which clears context and redirects to
`/login`.

`GET /auth/me` returns the user's permission array, stored on the user
object. The sidebar and `usePermission()`/`useHasResourceAccess()` hooks use
it to hide nav items the user has no access to (e.g. no `purchase:*`
permission hides "Purchase Orders" entirely). **This is UX polish only, not
a security boundary** — the backend enforces every permission server-side
via `@Permissions()` guards regardless of what the frontend shows or hides.

### Known limitation: display name after a silent refresh

`POST /auth/login`'s response includes `user.name`, but `POST /auth/refresh`
returns only `{ accessToken, expiresIn }` and `GET /auth/me` returns the raw
JWT-derived `AuthenticatedUser` (`userId`, `tenantId`, `email`, `permissions`,
`isSuperAdmin`) — neither carries `name`. So after a silent refresh (i.e.
any page load that isn't a fresh login), the frontend only has the user's
`email`, not their display name. `Topbar` falls back to showing the email in
that case (`user.name ?? user.email`). This is documented in
`lib/auth/types.ts` on `AuthUser.name`. Fixing it properly would mean adding
`name` to the API's `/auth/refresh` or `/auth/me` response, which is a
backend change out of scope for this frontend-only phase.

## Design system

The brief was a premium, multi-brand automotive workshop tool (BMW/Audi/
Mercedes/Volvo-tier shops) used primarily at a desktop/laptop workshop
counter — "instrument-cluster precision," not a generic admin template.
Concretely, that turned into:

- **Two-tone chrome/workspace split**: a dark graphite sidebar + topbar
  bar (`graphite-900`) against a workspace surface for content — the same
  pattern tools like Linear and VS Code use to make the persistent
  navigation feel like fixed instrumentation around a bright, scannable
  work surface, rather than everything competing for attention at once.
  The sidebar and the login screen are a fixed dark instrument bezel in
  **both** themes — they don't participate in the light/dark toggle below,
  by design, the same way a dashboard's physical bezel doesn't change
  color with the display behind it.
- **A single signature accent** — a burnished copper/amber (`accent-*` in
  `tailwind.config.ts`), deliberately not Tailwind's/shadcn's default
  indigo-blue, and deliberately a different hue from the semantic
  `warning` scale so "this is a brand-colored action" and "this needs your
  attention" never look the same.
- **Tabular monospace numerals everywhere a number is data** — KPI cards,
  table cells, money values — via `JetBrains Mono` (`--font-mono`), paired
  with `Inter` (`--font-sans`) for everything else. This is the one
  consistently-applied signature element the brief asked for: every job
  count, rupee amount, and stock level lines up and reads like an
  instrument readout instead of proportional body text. See `.num` in
  `app/globals.css` and the `font-mono tabular-nums` usage in
  `components/domain/kpi-card.tsx`.
- **A real type scale and spacing rhythm** defined in `tailwind.config.ts`
  rather than ad hoc utility classes.

`Geist`/`Geist Mono` were the original intent but aren't in this Next.js
version's (`14.2.35`) `next/font/google` catalogue, so `Inter` +
`JetBrains Mono` were used instead — same CSS variable contract
(`--font-sans`/`--font-mono`), so nothing downstream had to change.

### Light theme: a "milky white" workspace

The light-mode workspace canvas is a warm off-white (`#faf8f3`), not a
stark `#fff` or the cooler `graphite-50` the neutral scale would otherwise
default to — deliberately closer to milk/ivory than to clinical white, so
long stretches of table/card content don't read as sterile. Cards sit on
pure white (`--color-surface`) so they read as physically raised a shade
above the milky canvas rather than blending into it.

### Dark mode

Toggled from the sun/moon control in the topbar (`components/ui/theme-toggle.tsx`),
persisted to `localStorage` (`autonexa-theme`), and — on first visit, before
any explicit choice — seeded from the OS `prefers-color-scheme`.

The whole theme is implemented as **CSS custom properties**, not `dark:`
variants sprinkled through every component: `app/globals.css` defines
`--color-canvas`, `--color-surface`, `--color-surface-hover`,
`--color-line`(`-subtle`), and `--color-ink`(`-secondary`/`-muted`) under
`:root` (light) and again under `.dark` (dark), and `tailwind.config.ts`
maps them to Tailwind color tokens (`bg-canvas`, `bg-surface`,
`border-line`, `text-ink`, etc). Components are written once against those
token names — `<Card>`, `<Table>`, `<Input>`, the dashboard's KPI cards —
and get both themes for free, since the underlying CSS variable is what
changes, not the class name. `dark:` variants only appear where a component
uses a *raw* palette color on purpose (status badges, error banners,
alert-list text) rather than a semantic token, so those still needed an
explicit lighter shade for legibility against a dark surface.

Dark mode's palette isn't a separate set of colors — it reuses the existing
cool-toned `graphite` scale that the sidebar/topbar chrome was already
built from, so the workspace surface and the chrome read as one continuous
dark instrument panel instead of two mismatched dark tones once the toggle
is on.

**Avoiding a flash of the wrong theme**: a small inline `<script>` in
`app/layout.tsx`'s `<head>` runs before React hydrates and sets the `dark`
class on `<html>` synchronously from `localStorage`/`prefers-color-scheme`
— this can't be done in a `useEffect` (that would run after first paint,
causing a visible flash). `lib/theme/theme-context.tsx`'s `ThemeProvider`
then reads that already-applied class back as its initial state rather than
defaulting to `'light'` and re-deciding. Both `<html>` (in `app/layout.tsx`)
and the toggle's icon (in `theme-toggle.tsx`) carry `suppressHydrationWarning`
for the same reason: the server can't know a returning visitor's stored
preference, so its markup always assumes light, and the script's dark-mode
correction (applied before React ever hydrates) would otherwise trip
React's hydration-mismatch warning over a difference that was never
actually visible on screen.

## What's scaffolded but not built yet

The sidebar (`components/layout/nav-items.ts`) lists every module from the
Phase 1 architecture doc's folder structure, permission-gated per item. Only
**Dashboard** has a real page this phase. Every other route —
`/customers`, `/vehicles`, `/appointments`, `/job-cards`,
`/parts-inventory`, `/suppliers`, `/purchases`, `/invoices`, `/reports`,
`/settings` — renders the shared `<ComingSoon />` placeholder
(`components/domain/coming-soon.tsx`) rather than a raw 404, so the shell
doesn't need structural rework as each module lands in its own subsequent
frontend phase.

## Testing

**Vitest + React Testing Library**, chosen over Jest for faster startup and
native ESM/TS support without extra config, and because the project is
already Vite-adjacent tooling-wise. `jsdom` is the test environment;
`@testing-library/jest-dom/vitest` adds the DOM matchers.

Coverage this phase is intentionally narrow — pure logic and validation, not
full page/integration tests (not required for this phase):

- `lib/refresh-decision.test.ts` — the pure 401-handling decision function.
- `lib/api-client.test.ts` — the refresh/retry orchestration, especially the
  concurrent-401 stampede guard (see "Auth & token-refresh architecture"
  above).
- `lib/validation/login.test.ts` — login form validation.
