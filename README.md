# Atrium

Four personal apps, one login, hosted on Vercel: CRM, Space, Rolodex, Groove.

A Next.js + Postgres reimplementation of those jobs-to-be-done, not a fork. Owner account plus a resettable demo account.

Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](docs/superpowers/specs/2026-09-06-atrium-design.md)

## Setup

```bash
npm ci
cp .env.example .env
```

Fill in `.env`. `DATABASE_URL` is a Neon Postgres connection string. `AUTH_SECRET` is required for Auth.js. Names only live in `.env.example`.

## Commands

```bash
npm test           # Vitest (no live database required)
npm run dev        # Next.js dev server
npm run build      # production build
npm run db:generate  # drizzle-kit generate migrations from lib/db/schema.ts
npm run db:migrate   # apply migrations (needs DATABASE_URL)
npm run db:seed      # loads .env; idempotent owner + demo tenants/users
AUTH_SECRET=$(openssl rand -base64 32) npx playwright test
```

`AUTH_SECRET` must be in the environment of the process that runs Playwright.
`playwright.config.ts` calls `process.loadEnvFile(".env")`, so a value in `.env`
would reach both the runner and the dev server it starts; the failing case is
the one in this repo's local `.env`, which has `AUTH_OWNER_*` and `AUTH_DEMO_*`
but no `AUTH_SECRET` — Auth.js then throws `MissingSecret` from
`/api/auth/callback/credentials`. Either add it to `.env` (generate with
`openssl rand -base64 32`) or pass it on the command line as above.

`playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so **any**
`next-server` already listening on `:3000` is reused instead of started — and
*that* server's env wins, silently. If a foreign project is on `:3000`, find the
owner and stop it by PID (`ss -ltnp | grep :3000`, then `kill <pid>`); never
`pkill -f next-server`, which matches the server Playwright just started.

Playwright reads `.env` (via `playwright.config.ts`) for `AUTH_OWNER_EMAIL` /
`AUTH_OWNER_PASSWORD` (required — the specs throw from `beforeAll` without them)
and `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD` (those tests `test.skip` without
them). Do not commit `.env` or real passwords.

CI: the default `ci` job stays unit/build only and does not need secrets. A
separate `e2e` job installs Playwright Chromium and runs `npx playwright test`
only when **all six** of `DATABASE_URL`, `AUTH_SECRET`, `AUTH_OWNER_EMAIL`,
`AUTH_OWNER_PASSWORD`, `AUTH_DEMO_EMAIL`, and `AUTH_DEMO_PASSWORD` exist as
GitHub secrets; otherwise it reports `ready=false` and skips. The demo pair is
part of the gate on purpose: without it the demo-login specs `test.skip`, so a
`ready=true` on four secrets would be a green run that exercised nothing.
