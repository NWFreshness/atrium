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
```

## Verify

This exact command is the project's definition of working. `feature_list.json` `verify` fields
and `/factory-verify` both point at it.

```bash
env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build
```

Unit tests must pass with no `DATABASE_URL`. This is the CI `ci` job minus `npm ci`. Lint is
not a gate: 10 pre-existing `react-hooks/refs` findings and no CI lint step.

## Setup

```bash
./init.sh
```

## Layout

- `app/` — routes; `app/(authenticated)/` is the gated group. Shared CSS: `globals.css` (tokens), `workroom.css` (the shared `atrium-` layer).
- `components/{crm,space,rolodex,groove}/` — per-app UI and per-app CSS modules.
- `lib/db/` — schema, migrations entry, seed; all SQL goes through Drizzle here. `lib/{auth,tenancy,input}/` shared; `lib/{crm,space,rolodex}/queries*.ts` per-app (barrel / shared / memory / drizzle).
- `tests/` — repo-wide gates: theme contrast, CSS namespace, shell smoke. `lib/client-boundary.test.ts` gates the server/client import edge.
- `e2e/` — Playwright specs; needs all six `AUTH_*` / `DATABASE_URL` values, skips without them.
- `docs/superpowers/specs/` — product design. If a design doc still names the retired board, `feature_list.json` wins.
- `docs/adr/` — six accepted decisions plus a C4 view. The design doc wins if the two disagree.
- `inbox/` — one factory job card per scoped job. `factory/` — verify hook, job template, done rule.
- `progress.md` — factory session diary and current verified state. `feature_list.json` — factory machine state.

## Operating loop

Five stations, one direction. Do not skip forward.

1. `/factory-intake` — turn a request into exactly one scoped job card in `inbox/`.
2. `/factory-implement` — build the active feature and nothing else.
3. `/factory-review` — compare the diff against the job card. Gate only, no implementation.
4. `/factory-verify` — run the verify command and record real evidence.
5. `/factory-handoff` — close the session so a new chat resumes with no oral history.

Holds at every station:

- Exactly one feature may be `in_progress`.
- Only `/factory-verify` may set `status=passing`.
- Evidence is a command plus its exit code — never "implemented X" or "looks good".
- If the baseline is red, fix the baseline; do not start new work on top of it.
- Inside `/factory-implement`, prefer subagent-driven development: implementer, then spec-compliance review, then quality review. The controller re-runs the verify command and does not trust a subagent's "tests passed".

Station skills are factory-intake, factory-implement, factory-review, factory-verify, factory-handoff.

## Definition of done

A feature is passing only when all four are true:

1. the target behavior exists in the repo
2. the named verify command actually ran in this session
3. evidence is written in `progress.md` AND `feature_list.json`
4. the repo is restartable from this file plus `progress.md` with no chat history

## Hard constraints

- Never take `tenantId` from a request body or query string — always from the session.
- Groove never touches the database. No Groove tables, no Groove demo resetter; Web Audio only, engine imported from client components only.
- Keep CSS scoped per app. Prefixes: `crm-`, `space-`, `rolodex-`, `groove-`; shared nav is `atrium-nav-`. Shared nav classes must not rely on app theme variables.
- No Tailwind, shadcn, TanStack Router, or TanStack Query without a feature spec. TanStack Table only in CRM/Space table features.
- Write tests first on domain logic. Never weaken or delete a test to get a green run.
- One feature at a time — never start the next while one is in progress. `feature_list.json` governs that. Do not recreate `features/`, `CURRENT_FEATURE.md`, or `HANDOFF.md`.
- Ship on a `feat/` branch with a GitHub PR. Never commit or push to `main`. Never merge unless the user asks.
- Never commit secrets, tokens, `.env` values, or private URLs. `.env` is gitignored.
- Never edit files outside a job card's scope paths.
- Leave the `nextjs-agent-rules` block below in place; `next dev` re-adds it.

## State map

| File | Owns |
|---|---|
| `progress.md` | factory session diary + `## Current Verified State` |
| `feature_list.json` | factory machine state: statuses, scope, verify, evidence |
| `inbox/JOB-NNN-slug.md` | one job card: goal, scope, acceptance criteria, verify command |
| `factory/scripts/verify.sh` | the single verify hook |
| `factory/DEFINITION_OF_DONE.md` | the done rule |

Chat history and agent memory are **not** the system of record. If it is not in these files,
the next session cannot see it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
