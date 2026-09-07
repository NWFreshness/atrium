# Atrium

Four personal apps, one login, hosted on Vercel: CRM, Space, Rolodex, Groove.

Clone of the jobs in [ed-donner/bench](https://github.com/ed-donner/bench), not a fork. Next.js + Postgres. Owner account plus a resettable demo account.

Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](docs/superpowers/specs/2026-09-06-atrium-design.md)

Phase/feature board: [features/INDEX.md](features/INDEX.md)

Current feature: [CURRENT_FEATURE.md](CURRENT_FEATURE.md)

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
npx playwright test e2e/login.spec.ts  # needs AUTH_OWNER_EMAIL/PASSWORD
```

Playwright reads `.env` (via `playwright.config.ts`). It needs `AUTH_OWNER_EMAIL` and `AUTH_OWNER_PASSWORD`. Demo login is covered when `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD` are set. Do not commit `.env` or real passwords.

CI: the default `ci` job stays unit/build only and does not need secrets. A separate `e2e` job installs Playwright Chromium and runs `e2e/login.spec.ts` only when `DATABASE_URL`, `AUTH_SECRET`, `AUTH_OWNER_EMAIL`, and `AUTH_OWNER_PASSWORD` GitHub secrets exist; otherwise it skips successfully.
