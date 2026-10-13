# Atrium

Atrium is four tenant-scoped personal apps — CRM, Space, Rolodex, Groove — behind one Auth.js
login, as a Next.js App Router deploy on Neon Postgres with no shared UI framework.

## Stack

Next.js 16.3.4 App Router (root `app/`, no `src/`), React 19.2.8, TypeScript 5, npm. Neon
Postgres through `drizzle-orm/neon-http` + `@neondatabase/serverless` — that driver has no
`db.transaction()`, so multi-statement writes go through `db.batch` (see ADR-0002). Auth.js
credentials + JWT. Vitest for units, Playwright for flows, ESLint + Prettier. No Express, no
SQLite. Next 16 deprecates `middleware.ts` in favour of `proxy`; leave middleware until a
feature spec says otherwise. This version breaks APIs your training data knows — read
`node_modules/next/dist/docs/` before writing code.

## Run

```bash
npm run dev        # needs DATABASE_URL and AUTH_SECRET in .env
npm run dev -- -p <port>   # same, on a given port
```

## Verify

This exact command is the project's definition of working.

```bash
env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build
```

Unit tests must pass with no `DATABASE_URL`. This is the CI `ci` job minus `npm ci`. Lint is
not a gate: 10 pre-existing `react-hooks/refs` findings and no CI lint step.

## Setup

```bash
npm ci
```

`.env` is gitignored: copy `.env.example` to `.env` and fill `DATABASE_URL` + `AUTH_SECRET`.
The verify command does not need it.

## Layout

- `app/` — routes; `app/(authenticated)/` is the gated group. Shared CSS: `globals.css` (tokens), `workroom.css` (the shared `atrium-` layer).
- `components/{crm,space,rolodex,groove}/` — per-app UI and per-app CSS modules.
- `lib/db/` — schema, migrations entry, seed; all SQL goes through Drizzle here. `lib/{auth,tenancy,input}/` shared; `lib/{crm,space,rolodex}/queries*.ts` per-app (barrel / shared / memory / drizzle).
- `tests/` — repo-wide gates: theme contrast, CSS namespace, shell smoke. `lib/client-boundary.test.ts` gates the server/client import edge.
- `e2e/` — Playwright specs; needs all six `AUTH_*` / `DATABASE_URL` values, skips without them.
- `docs/superpowers/specs/` — product design.
- `docs/adr/` — six accepted decisions plus a C4 view. The design doc wins if the two disagree.
- `roadmap/phases.yaml` — phases and one-line feature intents.
- `specs/<id>-<slug>.md` — one approved or draft spec per feature.
- `progress.md` — session diary and current verified state (last 3 sessions inline).

## Hard constraints

- Never take `tenantId` from a request body or query string — always from the session.
- Groove never touches the database. No Groove tables, no Groove demo resetter; Web Audio only, engine imported from client components only.
- Keep CSS scoped per app. Prefixes: `crm-`, `space-`, `rolodex-`, `groove-`; shared nav is `atrium-nav-`. Shared nav classes must not rely on app theme variables.
- No Tailwind, shadcn, TanStack Router, or TanStack Query without a feature spec. TanStack Table only in CRM/Space table features.
- Write tests first on domain logic. Never weaken or delete a test to get a green run.
- Work on a branch. Never commit or push to `main`.
- Never commit secrets, tokens, `.env` values, or private URLs. `.env` is gitignored.
- Leave the `nextjs-agent-rules` block below in place; `next dev` re-adds it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
