# Handoff

Read this first if you did not write the previous session.

**Stop. Nothing is in progress.** 9.1 is complete on this branch (awaiting merge). Do not start 9.2 until 9.1 has a `mergedAt`. Do not push to `main`. Do not merge unless asked.

## Where we are (2026-09-11)

Phases 0–8 are complete. 9.1 bumped `drizzle-orm` to 0.45.2 and added `npm audit --omit=dev --audit-level=high` to the `ci` job. Next is 9.2 after this PR merges. Design: `docs/superpowers/specs/2026-09-11-security-design.md`.

Repo: https://github.com/NWFreshness/atrium.git

Board: `features/INDEX.md` (source of truth for done vs not).
Pointer + log: `CURRENT_FEATURE.md`.
Product design: `docs/superpowers/specs/2026-09-06-atrium-design.md` (amended for Phase 9). Architecture: `docs/superpowers/specs/2026-09-11-architecture-design.md`. Integrity: `docs/superpowers/specs/2026-09-11-integrity-design.md`. Security: `docs/superpowers/specs/2026-09-11-security-design.md`. Decisions: `docs/adr/` (ADR-0001 … ADR-0006 + a C4 context/container view; the design doc wins if an ADR and it disagree). Accounts: `docs/superpowers/specs/2026-09-11-accounts-design.md`. Rolodex: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. Groove: `docs/superpowers/specs/2026-09-09-groove-design.md`. Workroom prototype: `docs/prototypes/2026-09-10-workroom/`. If a spec and the design disagree, update the design first.

Open decisions carried forward: Session revocation was decided in 6.3: passwords can be changed, but existing JWTs stay valid — no revocation list, no `passwordChangedAt` claim, by spec. RLS is deferred: neon-http cannot persist `SET LOCAL`. 8.1 closed the case-sensitive `users_email_unique` index — uniqueness is now `users_email_lower_idx` on `lower(email)`. 8.2 closed the UTF-16 password floor. Deliberately still open, and not to be reopened without a spec: RLS (neon-http cannot persist `SET LOCAL`), session revocation, OAuth, a mailer, `tenants.name` moving to `lower(name)`, `Intl.Segmenter` grapheme counting, and Next 16's `middleware.ts` → `proxy` rename (it stays out until a feature has to touch that file).

## Read order

1. This file
2. `AGENTS.md`
3. `README.md`
4. Design docs above
5. `features/INDEX.md` and `CURRENT_FEATURE.md`
6. After 9.1 merges: `features/phase-9-security/9.2-isolation-headers.md`. Do not start 9.2 on this branch.

## How we ship

- One feature at a time. Mark it `in_progress` in the spec, INDEX, and CURRENT_FEATURE before coding.
- Branch `feat/…` from current `main`. Never commit or push to `main`. Open a GitHub PR. Do not merge unless the user asks.
- TDD on domain logic. Playwright for flows that already have a spec for it.
- Preferred execution: subagent-driven-development — implementer, then spec-compliance review, then quality review. Controller (the parent agent) re-runs `npm test` and `npm run build` and does not trust a subagent “tests passed” claim.
- When the feature is done: check acceptance boxes, set status `completed`, append a short summary to the CURRENT_FEATURE log (never delete old log entries), then PR.
- `AGENTS.md` is a protected instruction file in some agent runtimes; the user has allowed writes to it in this repo. Leave the `nextjs-agent-rules` block in place (`next dev` re-adds it).

## Env and database

`.env` is gitignored. Do not commit it. Do not paste connection strings or passwords into chat or tickets.

- **Dev:** local `.env` points at a Neon **dev** branch. If pages 500 on missing tables, run `npm run db:migrate` then `npm run db:seed` against the dev URL. Dummy local users live only on that branch. The dev branch is current — `0005` and `0006` were applied after 8.1 merged (`npm run db:migrate` → all seven migrations, `npm run db:seed` exit 0; `users_email_lower_idx` verified present, `users_email_unique` gone). Prod still needs the same `npm run db:migrate` on deploy.
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

Phase 8 is complete and the dev branch carries every migration (`0000`–`0006`). 9.1 is complete on this branch. After it merges: `git checkout main && git pull`, branch `feat/9.2-isolation-headers`, and implement 9.2 only.
