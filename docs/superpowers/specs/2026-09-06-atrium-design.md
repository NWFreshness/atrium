# Atrium Design

**Date:** 2026-09-06
**Status:** approved
**Product:** Atrium
**Repo:** https://github.com/NWFreshness/atrium.git
**Local path:** `/Users/tylermayfield/Documents/projects/atrium`
**Behavior source:** [ed-donner/bench](https://github.com/ed-donner/bench) (reference only, not a fork)

This document is the approved product design. Feature specs and code come after this file is reviewed. If this file and a later spec disagree, update this file first.

---

## Problem

Bench is four local-first personal apps (CRM, Space, Rolodex, Groove) behind one Vite MPA, one Express process, and SQLite files on disk. That architecture cannot host on Vercel: no durable filesystem, no long-lived Node server.

Atrium is a Vercel-hosted clone of those four apps as one Next.js product, with a real login for the owner and a separate demo login with seed data.

## Users

- **Owner** — Tyler. Persistent personal data. Never wiped by demo tooling.
- **Demo** — whoever has the demo password. Seeded data. Can be reset on demand without touching owner data.
- **No public signup.** Two env-configured accounts only in v1.

## What we are cloning

Same jobs-to-be-done as Bench, not pixel-identical CSS and not a file-by-file port of Express + SQLite + Vite.

| App | Path | Job |
| --- | --- | --- |
| Launcher | `/` | One entrance to the four apps |
| CRM | `/crm` | Personal sales CRM: organizations, contacts, deals, drag-and-drop pipeline, activities, dashboard |
| Space | `/space` | Personal knowledge manager: pages and blocks, databases with table / board / list views, search |
| Rolodex | `/rolodex` | Personal CRM: people, circles, cadences, birthdays, conversation timeline, CSV and vCard import |
| Groove | `/groove` | Browser groovebox: four synth units, one transport, master DJ filter, Web Audio only |

Bench `docs/<app>/REQUIREMENTS.md` and `IMPLEMENTATION.md` are the behavior bible per app. Where they disagree with Bench's code, prefer Bench's code as the original truth, then adapt to this design (tenancy, Next.js, Postgres).

## Non-goals (v1)

- Public signup, OAuth, magic links, billing
- Multi-member tenants / team sharing
- Realtime collaboration
- Native mobile apps
- Merging Atrium into Cascade or ReconIQ
- Bench teaching-repo controls (gitleaks, knip, jscpd, 80% coverage gate)
- SQLite, better-sqlite3, Express, Vite MPA
- TanStack Router (Next.js owns routing)
- TanStack Query in v1 (RSC + server actions; add later only if client cache becomes a real problem)

OAuth and signup are deferred, not forbidden. The user/session schema must not block adding them later.

---

## Architecture

One Next.js App Router app. One Vercel project. One Postgres database.

```
app/
  layout.tsx                 fonts, theme init
  login/                     credentials form (unauthenticated)
  (authenticated)/
    layout.tsx               Bench-style nav strip, theme toggle, identity, Reset demo (demo only)
    page.tsx                 launcher
    crm/                     CRM UI
    space/                   Space UI
    rolodex/                 Rolodex UI
    groove/                  Groove UI (client components for Web Audio)
lib/
  auth/                      Auth.js config, password hashing
  db/                        Drizzle client
  tenancy/                   session → tenantId; every query takes tenant from session
  crm|space|rolodex/         schema, queries, seed for that app only
```

Routes:

- `/` launcher (behind login)
- `/login` credentials form
- `/crm/*` CRM
- `/space/*` Space
- `/rolodex/*` Rolodex
- `/groove/*` Groove (no DB; still behind login so the suite is one product)

CSS: per-app CSS modules or a stylesheet scoped to that app's root. Do not load four global stylesheets into one document. Shared nav CSS is `atrium-nav`-prefixed and self-contained (literals, not theme variables), because Groove and the others will still collide on `.board`, `.app`, `:root`.

Theme: `data-theme` on the document element, remembered in `localStorage` under `atrium.theme`. Init before first paint. First visit follows the OS. Groove may default dark and define `[data-theme="light"]`, matching Bench.

Server work is Route Handlers and server actions. No Express. No long-lived process.

Vercel hosts the Next app as usual. The database engine is PostgreSQL, hosted on Neon (not the Vercel Postgres wrapper). Local and production both use `DATABASE_URL` against Neon (a dev branch locally). Docker Postgres is not required.

---

## Auth and data

### Accounts

Two users, created at migrate/bootstrap from env:

- `AUTH_OWNER_EMAIL` / `AUTH_OWNER_PASSWORD`
- `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD` (default email `demo@atrium.local`)

Auth.js with the Credentials provider. JWT session cookie.

`User`: `id`, `email`, `passwordHash`, `tenantId`, `role` (`owner` | `demo`), `createdAt`.

Auth.js `Account` and `Session` tables exist in the adapter shape even if unused in v1, so a Google provider later is an adapter add, not a schema rewrite. No signup UI until that day.

Login errors: generic "Invalid email or password". Unauthenticated requests redirect to `/login`.

### Tenancy

Owner tenant and demo tenant are two rows. No shared records.

Every CRM, Space, and Rolodex row has `tenant_id`. Queries take `tenantId` from the session. The client never supplies tenant id. Groove has no tenant data.

### Demo reset

Visible only when `role === demo`. Nav control: "Reset demo".

Server action: in one transaction, delete that tenant's CRM/Space/Rolodex rows, then re-seed that `tenant_id`. Owner tenant is unreachable from this path (explicit `tenant_id` + `role` check). If the transaction fails, data is left as-is; show a banner.

Reset persists during a demo until someone clicks it. Cron is optional later, not phase 0.

### Seed

Demo tenant: deterministic sample data ported from Bench seeds (orgs/contacts/deals, a few Space pages, a few Rolodex people).

Owner tenant: empty. No welcome records.

### Data flow

1. Browser hits a protected route.
2. Auth.js session cookie → user → `tenantId` + `role`.
3. Server action / route handler runs Drizzle queries with that `tenantId`.
4. JSON or RSC payload back to the app UI.
5. Groove never hits the database.

---

## Phases

Each Bench application is a phase. Foundation is phase 0 because auth, tenancy, and the shell must exist first.

Build order is 0 → 1 → 2 → 3 → 4. One feature at a time. No parallel features that touch the same files.

### Phase 0 — Atrium platform

Next.js app, AGENTS.md, Drizzle/Postgres, Auth.js two accounts, launcher, shared nav + theme, tenant helper, Reset demo (no-op until an app has tables). Tracking files: `features/INDEX.md`, `CURRENT_FEATURE.md`, feature specs.

### Phase 1 — CRM

Organizations, contacts, deals, drag-and-drop pipeline, activities, dashboard. Tenant-scoped. Demo seed included.

### Phase 2 — Space

Pages + blocks, databases with table / board / list views, search. Tenant-scoped.

### Phase 3 — Rolodex

People, circles, cadences, birthdays, conversation timeline, CSV and vCard import. Tenant-scoped.

### Phase 4 — Groove

Four synths, one transport, master DJ filter, Web Audio only. No DB. Behind login.

---

## Testing and quality

Not cloning Bench's course control plane.

- TypeScript strict
- ESLint + Prettier
- Vitest for domain logic: tenancy, password verify, demo reset transaction, per-app calculations
- Playwright: login, launcher, theme; one smoke per app as that phase ships; deeper e2e inside the feature that needs it
- TDD on feature implementation
- After every feature, the controller re-runs `npm test` and `npm run build`. Subagent "tests passed" is not accepted alone
- Minimal GitHub Actions workflow in phase 0: test + build on push

Coverage is a signal, not an 80% gate.

---

## Process files

| File | Role |
| --- | --- |
| `features/INDEX.md` | The board. Phases, feature ids, status, one-line summary, link to spec. This is how you see what is done. No second progress file. |
| `CURRENT_FEATURE.md` | Top: the single in-progress feature (id, link, status). Bottom: append-only log. When a feature finishes, add a short summary. Never delete old summaries. |
| `features/phase-N-name/N.M-feature-name.md` | One spec per feature. writing-plans template: Goal, Scope, Files, Acceptance criteria, Verification, Commit. Status updated in the same commit as the work. |
| `AGENTS.md` | Stack, tenancy rule (no query without tenant_id from session), CSS scoping, TDD, do not copy Bench's Express/SQLite. |
| `docs/superpowers/specs/2026-09-06-atrium-design.md` | This design. Frozen after review; amend deliberately if the product changes. |

Rules:

- Only one feature `in_progress`
- Specs exist before subagent-driven-development implementers run
- Finish feature → check acceptance → update spec status, INDEX, CURRENT_FEATURE log → next spec

Feature granularity: independently shippable, hours to a couple of days, numbered `phase.feature`.

---

## Stack (locked)

- Next.js App Router (current stable at implementation time)
- TypeScript strict
- PostgreSQL hosted on Neon (`DATABASE_URL`)
- Drizzle ORM + drizzle-kit migrations (TypeScript schema, SQL-shaped queries, no Prisma engine)
- Auth.js (Credentials now)
- Vitest + Playwright
- Vercel

### TanStack

Bench used `@tanstack/react-table` for CRM/Space grids. Atrium does the same, and only that:

- **Table:** yes, when CRM (phase 1) and Space table views (phase 2) ship. Not in phase 0.
- **Router:** no. Next.js App Router.
- **Query:** no in v1. Server Components and server actions load and mutate data. Revisit if a screen needs rich client cache.

Do not add TanStack packages until the feature that uses them.

## Environment (phase 0)

- `DATABASE_URL` (Neon Postgres connection string)
- `AUTH_SECRET`
- `AUTH_OWNER_EMAIL` / `AUTH_OWNER_PASSWORD`
- `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD`
- Never commit `.env`. Example values live in `.env.example` without real passwords.

---

## Implementation sequence after this file is approved

1. writing-plans (feature spec mode): INDEX + CURRENT_FEATURE + phase 0 specs only. Later phases get specs when that phase starts, not a 40-file dump up front.
2. User confirms the phase 0 backlog.
3. subagent-driven-development: one feature at a time, spec review then quality review, controller verifies test + build.

Progress: `features/INDEX.md`. Phase 0 specs 0.1–0.5 exist. 0.1–0.3 are completed on `main`. Next implementable unit is 0.4. Do not treat the three steps above as outstanding work.
