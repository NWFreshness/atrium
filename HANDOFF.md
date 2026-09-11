# Handoff

Read this first if you did not write the previous session.

**Stop. Phase 7 Architecture is complete: 7.1 (ADRs), 7.2 (atomic demo reset), 7.3 (`tenantId` indexes), 7.4 (query-module split) and 7.5 (client/server import boundary) are done.** Do not push to `main`. Do not merge unless asked. Nothing is specced after 7.5: the next unit is a docs PR writing the next phase's specs.

## Where we are (2026-09-11)

Phases 0–6 are complete. Phase 7 Architecture is complete: 7.1 shipped `docs/adr/` (six accepted ADRs plus a C4, docs-only), 7.2 made Reset demo one Neon `db.batch` — 717 statements collected by `lib/db/batch-transaction.ts`, verified live against the dev branch — 7.3 added a B-tree index on `tenantId` for all nineteen tenant-scoped tables (migration `drizzle/0005_uneven_prodigy.sql`), 7.4 split each app's query module into `queries.ts` (barrel) + `queries-shared.ts` + `queries-memory.ts` + `queries-drizzle.ts`, and 7.5 added `lib/client-boundary.test.ts`, which walks the value-import graph from every file under `components/` and fails if any of them reaches `lib/db`, a query module, a schema, a seed, a reset, `drizzle-orm` or `@neondatabase/serverless` — directly or through a helper three modules away. Nothing is specced yet for the next phase; that docs PR is the next unit.

Repo: https://github.com/NWFreshness/atrium.git

Board: `features/INDEX.md` (source of truth for done vs not).
Pointer + log: `CURRENT_FEATURE.md`.
Product design: `docs/superpowers/specs/2026-09-06-atrium-design.md` (amended for Phase 7). Architecture: `docs/superpowers/specs/2026-09-11-architecture-design.md`. Decisions: `docs/adr/` (ADR-0001 … ADR-0006 + a C4 context/container view; the design doc wins if an ADR and it disagree). Accounts: `docs/superpowers/specs/2026-09-11-accounts-design.md`. Rolodex: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. Groove: `docs/superpowers/specs/2026-09-09-groove-design.md`. Workroom prototype: `docs/prototypes/2026-09-10-workroom/`. If a spec and the design disagree, update the design first.

Open decisions carried forward: the `users_email_unique` index is still case-sensitive (a `lower(email)` unique index would close the concurrent case-variant signup race). Session revocation was decided in 6.3: passwords can be changed, but existing JWTs stay valid — no revocation list, no `passwordChangedAt` claim, by spec. Phase 7 does not reopen that. RLS is deferred: neon-http cannot persist `SET LOCAL`. Other pre-existing items are listed in the 6.3 shipped notes (UTF-16 password length counting; the Rolodex client chunk that carries Drizzle — 7.5).

## Read order

1. This file
2. `AGENTS.md`
3. `README.md`
4. Design docs above
5. `features/INDEX.md` and `CURRENT_FEATURE.md`
6. Nothing is specced after 7.5 — the next unit is a docs PR writing the next phase's specs (the shape 7.1–7.5 arrived in, as `#64`)

## How we ship

- One feature at a time. Mark it `in_progress` in the spec, INDEX, and CURRENT_FEATURE before coding.
- Branch `feat/…` from current `main`. Never commit or push to `main`. Open a GitHub PR. Do not merge unless the user asks.
- TDD on domain logic. Playwright for flows that already have a spec for it.
- Preferred execution: subagent-driven-development — implementer, then spec-compliance review, then quality review. Controller (the parent agent) re-runs `npm test` and `npm run build` and does not trust a subagent “tests passed” claim.
- When the feature is done: check acceptance boxes, set status `completed`, append a short summary to the CURRENT_FEATURE log (never delete old log entries), then PR.
- `AGENTS.md` is a protected instruction file in some agent runtimes; the user has allowed writes to it in this repo. Leave the `nextjs-agent-rules` block in place (`next dev` re-adds it).

## Env and database

`.env` is gitignored. Do not commit it. Do not paste connection strings or passwords into chat or tickets.

- **Dev:** local `.env` points at a Neon **dev** branch. If pages 500 on missing tables, run `npm run db:migrate` then `npm run db:seed` against the dev URL. Dummy local users live only on that branch. Migration `0005_uneven_prodigy.sql` (19 `tenantId` indexes, additive, `CREATE INDEX IF NOT EXISTS`) is not applied yet — run `npm run db:migrate` after 7.3 merges.
- **Prod:** production `DATABASE_URL` belongs in Vercel only. Git `drizzle/` is the schema source of truth. Apply the same `npm run db:migrate` against prod when deploying; do not copy data from dev. Seed prod with the real owner email/password via env, not the dummy local pair.
- Unit tests must pass **without** `DATABASE_URL`.
- CI job `ci`: `npm ci`, `npm test`, `npm run build` (dummy `AUTH_SECRET` for build). Job `e2e`: Playwright, skips unless GitHub secrets `DATABASE_URL`, `AUTH_SECRET`, `AUTH_OWNER_EMAIL`, `AUTH_OWNER_PASSWORD` exist.
- Phase 6: `AUTH_SIGNUP_ENABLED` — only the string `true` opens signup. Missing or anything else is closed. Open-signup Playwright needs the flag on in the Next process env.

`.env.example` lists names only.

## Stack locks

Next.js App Router, Neon Postgres, Drizzle, Auth.js Credentials + JWT. No Express, no SQLite, no Tailwind, no TanStack until a CRM/Space/Rolodex table spec. Session `user` has `id`, `email`, `tenantId`, `role` (`owner` | `demo` | `member` after 6.1). Never take `tenantId` from the client.

Next 16 warns that `middleware.ts` is deprecated in favor of `proxy`. Leave middleware unless a feature spec says to rename it.

## First command after clone

```bash
git checkout main && git pull
npm ci
cp .env.example .env   # fill from the user’s Neon dev URL; do not use prod
npm test
npm run build
```

Phase 7 is complete. The next unit is a docs PR speccing the next phase — one spec per feature, in `features/<phase>/`, an `INDEX.md` row each, and no implementation until it merges.
