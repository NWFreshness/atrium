# Handoff

Read this first if you did not write the previous session.

**Stop. Nothing is in progress.** 8.1 (case-insensitive unique email) is implemented on `feat/8.1-case-insensitive-email` and awaiting merge; Phase 8 continues with 8.2 (password policy in code points) then 8.3 (shared `PERSON_FIELDS`). Implement 8.2 from `main` after 8.1 merges. Do not push to `main`. Do not merge unless asked.

## Where we are (2026-09-11)

Phases 0–7 are complete. 8.1 shipped the `lower(email)` unique index (`users_email_lower_idx`) in place of `users.email`'s byte-exact unique, plus the seed change that followed from it. Phase 8 continues: 8.2 moves the password floor to Unicode code points behind one policy module, 8.3 gives Rolodex import a single client-safe `PERSON_FIELDS` catalog. Start 8.2 from `main` once 8.1 merges.

Repo: https://github.com/NWFreshness/atrium.git

Board: `features/INDEX.md` (source of truth for done vs not).
Pointer + log: `CURRENT_FEATURE.md`.
Product design: `docs/superpowers/specs/2026-09-06-atrium-design.md` (amended for Phase 8). Architecture: `docs/superpowers/specs/2026-09-11-architecture-design.md`. Integrity: `docs/superpowers/specs/2026-09-11-integrity-design.md`. Decisions: `docs/adr/` (ADR-0001 … ADR-0006 + a C4 context/container view; the design doc wins if an ADR and it disagree). Accounts: `docs/superpowers/specs/2026-09-11-accounts-design.md`. Rolodex: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. Groove: `docs/superpowers/specs/2026-09-09-groove-design.md`. Workroom prototype: `docs/prototypes/2026-09-10-workroom/`. If a spec and the design disagree, update the design first.

Open decisions carried forward: Session revocation was decided in 6.3: passwords can be changed, but existing JWTs stay valid — no revocation list, no `passwordChangedAt` claim, by spec. RLS is deferred: neon-http cannot persist `SET LOCAL`. 8.1 closed the case-sensitive `users_email_unique` index — uniqueness is now `users_email_lower_idx` on `lower(email)`. The UTF-16 password floor is 8.2. Next 16's `middleware.ts` → `proxy` rename stays out until a feature has to touch that file.

## Read order

1. This file
2. `AGENTS.md`
3. `README.md`
4. Design docs above
5. `features/INDEX.md` and `CURRENT_FEATURE.md`
6. `features/phase-8-integrity/8.2-password-policy.md` — next implementable unit, from `main` after 8.1 merges. 8.3 (`8.3-person-field-catalog.md`) follows; do not run two features at once.

## How we ship

- One feature at a time. Mark it `in_progress` in the spec, INDEX, and CURRENT_FEATURE before coding.
- Branch `feat/…` from current `main`. Never commit or push to `main`. Open a GitHub PR. Do not merge unless the user asks.
- TDD on domain logic. Playwright for flows that already have a spec for it.
- Preferred execution: subagent-driven-development — implementer, then spec-compliance review, then quality review. Controller (the parent agent) re-runs `npm test` and `npm run build` and does not trust a subagent “tests passed” claim.
- When the feature is done: check acceptance boxes, set status `completed`, append a short summary to the CURRENT_FEATURE log (never delete old log entries), then PR.
- `AGENTS.md` is a protected instruction file in some agent runtimes; the user has allowed writes to it in this repo. Leave the `nextjs-agent-rules` block in place (`next dev` re-adds it).

## Env and database

`.env` is gitignored. Do not commit it. Do not paste connection strings or passwords into chat or tickets.

- **Dev:** local `.env` points at a Neon **dev** branch. If pages 500 on missing tables, run `npm run db:migrate` then `npm run db:seed` against the dev URL. Dummy local users live only on that branch. Migrations `0005_uneven_prodigy.sql` (19 `tenantId` indexes) and `0006_sleepy_preak.sql` (8.1's `lower(email)` unique index) are not applied yet — run `npm run db:migrate` then `npm run db:seed` after 8.1 merges. If the dev branch already holds two rows that collide on `lower(email)`, the index create will fail: that is the invariant asserting itself.
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

8.1 is implemented and awaiting merge. After it merges: `git checkout main && git pull`, branch `feat/8.2-password-policy`, implement only 8.2.
