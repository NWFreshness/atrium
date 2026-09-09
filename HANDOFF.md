# Handoff

Read this first if you did not write the previous session.

**Stop. Next work is feature 3.2.** Do not run 3.3 in parallel with 3.2. Do not invent Groove specs. Do not push to `main`.

## Where we are (2026-09-06)

Phase 1 of Atrium (specs written). Repo: https://github.com/NWFreshness/atrium.git

| ID | Status |
| --- | --- |
| 0.1 Next.js scaffold + CI | completed (PR #1) |
| 0.2 Drizzle + Neon users/tenants | completed (PR #2) |
| 0.3 Auth.js credentials login | completed (PR #3) |
| 0.4 Nav, theme, launcher | completed (PR #5) |
| 0.5 Tenancy helper + Reset demo | completed (PR #6) |
| 1.1 CRM schema, seed, resetter | completed (PR #8) |
| 1.2 CRM shell and subnav | completed (PR #9) |
| 1.3 Organizations table and detail | completed (PR #10) |
| 1.4 Contacts table and detail | completed (PR #11) |
| 1.5 Deals table | completed (PR #12) |
| 1.6 Pipeline board | completed (PR #13) |
| 1.7 Activities and follow-ups | completed (PR #14) |
| 1.8 Dashboard | completed (PR #15) |
| 1.9 Playwright smoke | completed (PR #16) |
| 2.1 Space schema, seed, resetter | completed (PR #18) |
| 2.2 Space shell | completed (PR #19) |
| 2.3 Pages tree in the sidebar | completed (PR #20) |
| 2.4 Block editor | completed (PR #21) |
| 2.5 Databases and table view | completed (PR #22) |
| 2.6 Board, list, filters, sorts | completed (PR #23) |
| 2.7 Quick-find search | completed (PR #24) |
| 2.8 Playwright smoke | completed (PR #25) |
| **3.1 Schema, seed, resetter** | **completed** |
| **3.2 Shell and subnav** | **next** |

Phase 1 CRM and Phase 2 Space are complete. Phase 3 Rolodex specs 3.1–3.10 are written. Groove specs are not. Do not invent them.

Board: `features/INDEX.md` (source of truth for done vs not).
Pointer + log: `CURRENT_FEATURE.md`.
Product design: `docs/superpowers/specs/2026-09-06-atrium-design.md` (approved). Rolodex: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. If a spec and the design disagree, update the design first.

## Read order

1. This file
2. `AGENTS.md`
3. `README.md`
4. Design doc above
5. `features/INDEX.md` and `CURRENT_FEATURE.md`
6. `features/phase-3-rolodex/3.2-rolodex-shell.md` — implement that spec, nothing else

Behavior bible for later apps: [ed-donner/bench](https://github.com/ed-donner/bench) `docs/<app>/` — clone jobs-to-be-done, not Express/SQLite/Vite.

## How we ship

- One feature at a time. Mark it `in_progress` in the spec, INDEX, and CURRENT_FEATURE before coding.
- Branch `feat/…` from current `main`. Never commit or push to `main`. Open a GitHub PR. Do not merge unless the user asks.
- TDD on domain logic. Playwright for flows that already have a spec for it.
- Preferred execution: subagent-driven-development — implementer, then spec-compliance review, then quality review. Controller (the parent agent) re-runs `npm test` and `npm run build` and does not trust a subagent “tests passed” claim.
- When the feature is done: check acceptance boxes, set status `completed`, append a short summary to the CURRENT_FEATURE log (never delete old log entries), then PR.
- `AGENTS.md` is a protected instruction file in some agent runtimes; the user has allowed writes to it in this repo. Leave the `nextjs-agent-rules` block in place (`next dev` re-adds it).

## Env and database

`.env` is gitignored. Do not commit it. Do not paste connection strings or passwords into chat or tickets.

- **Dev:** local `.env` points at a Neon **dev** branch. Schema through `drizzle/0002_panoramic_smasher.sql` (Space tables) must be migrated there. If CRM pages 500 on missing tables, run `npm run db:migrate` then `npm run db:seed` against the dev URL. Dummy local users live only on that branch.
- **Prod:** production `DATABASE_URL` belongs in Vercel only. Git `drizzle/` is the schema source of truth. Apply the same `npm run db:migrate` against prod when deploying; do not copy data from dev. Seed prod with the real owner email/password via env, not the dummy local pair.
- Unit tests must pass **without** `DATABASE_URL`.
- CI job `ci`: `npm ci`, `npm test`, `npm run build` (dummy `AUTH_SECRET` for build). Job `e2e`: Playwright, skips unless GitHub secrets `DATABASE_URL`, `AUTH_SECRET`, `AUTH_OWNER_EMAIL`, `AUTH_OWNER_PASSWORD` exist.

`.env.example` lists names only.

## Stack locks

Next.js App Router, Neon Postgres, Drizzle, Auth.js Credentials + JWT. No Express, no SQLite, no Tailwind, no TanStack until a CRM/Space/Rolodex table spec. Session `user` has `id`, `email`, `tenantId`, `role`. Never take `tenantId` from the client.

Next 16 warns that `middleware.ts` is deprecated in favor of `proxy`. Leave middleware unless a feature spec says to rename it.

## First command after clone

```bash
git checkout main && git pull
npm ci
cp .env.example .env   # fill from the user’s Neon dev URL; do not use prod
npm test
npm run build
```

Then implement 3.2 from its spec.
