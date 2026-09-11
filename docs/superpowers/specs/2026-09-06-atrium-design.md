# Atrium Design

**Date:** 2026-09-06
**Status:** approved
**Product:** Atrium
**Repo:** https://github.com/NWFreshness/atrium.git
**Local path:** `/Users/tylermayfield/Documents/projects/atrium`
**Behavior source:** the reference implementation (reference only, not a fork)

This document is the approved product design. Feature specs and code come after this file is reviewed. If this file and a later spec disagree, update this file first.

---

## Problem

The reference implementation is four local-first personal apps (CRM, Space, Rolodex, Groove) behind one Vite MPA, one Express process, and SQLite files on disk. That architecture cannot host on Vercel: no durable filesystem, no long-lived Node server.

Atrium is a Vercel-hosted clone of those four apps as one Next.js product, with a real login for the owner and a separate demo login with seed data.

## Users

- **Owner** — Tyler. Persistent personal data. Never wiped by demo tooling.
- **Demo** — whoever has the demo password. Seeded data. Can be reset on demand without touching owner data.
- **Member** — self-serve signup (Phase 6) when `AUTH_SIGNUP_ENABLED=true`. Own empty tenant. No Reset demo. See [2026-09-11-accounts-design.md](./2026-09-11-accounts-design.md).

## What we are cloning

Same jobs-to-be-done as the reference implementation, not pixel-identical CSS and not a file-by-file port of Express + SQLite + Vite.

| App | Path | Job |
| --- | --- | --- |
| Launcher | `/` | One entrance to the four apps |
| CRM | `/crm` | Personal sales CRM: organizations, contacts, deals, drag-and-drop pipeline, activities, dashboard |
| Space | `/space` | Personal knowledge manager: pages and blocks, databases with table / board / list views, search |
| Rolodex | `/rolodex` | Personal CRM: people, circles, cadences, birthdays, conversation timeline, CSV and vCard import |
| Groove | `/groove` | Browser groovebox: four synth units, one transport, master DJ filter, Web Audio only |

The reference implementation's `docs/<app>/REQUIREMENTS.md` and `IMPLEMENTATION.md` are the behavior bible per app. Where they disagree with the reference implementation's code, prefer the reference implementation's code as the original truth, then adapt to this design (tenancy, Next.js, Postgres).

## Non-goals (v1)

- Ungated public signup (Phase 6 is flag-gated), OAuth, magic links, billing
- Multi-member tenants / team sharing
- Realtime collaboration
- Native mobile apps
- Merging Atrium into Cascade or ReconIQ
- The reference teaching-repo controls (gitleaks, knip, jscpd, 80% coverage gate)
- SQLite, better-sqlite3, Express, Vite MPA
- TanStack Router (Next.js owns routing)
- TanStack Query in v1 (RSC + server actions; add later only if client cache becomes a real problem)

OAuth is deferred, not forbidden. Credentials signup is Phase 6, behind `AUTH_SIGNUP_ENABLED`. The user/session schema must not block adding Google later (`accounts` / `sessions` tables stay).

---

## Architecture

One Next.js App Router app. One Vercel project. One Postgres database.

```
app/
  layout.tsx                 fonts, theme init
  login/                     credentials form (unauthenticated)
  signup/                    create member + tenant (flag-gated)
  (authenticated)/
    settings/                change password
    layout.tsx               reference-style nav strip, theme toggle, identity, Reset demo (demo only)
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
- `/signup` flag-gated member signup
- `/settings` change password (behind login)
- `/crm/*` CRM
- `/space/*` Space
- `/rolodex/*` Rolodex
- `/groove/*` Groove (no DB; still behind login so the suite is one product)

CSS: per-app CSS modules or a stylesheet scoped to that app's root. Do not load four global stylesheets into one document. Shared nav CSS is `atrium-nav`-prefixed and self-contained (literals, not theme variables), because Groove and the others will still collide on `.board`, `.app`, `:root`.

Theme: `data-theme` on the document element, remembered in `localStorage` under `atrium.theme`. Init before first paint. First visit follows the OS. Groove may default dark and define `[data-theme="light"]`, matching the reference.

Server work is Route Handlers and server actions. No Express. No long-lived process.

Vercel hosts the Next app as usual. The database engine is PostgreSQL, hosted on Neon (not the Vercel Postgres wrapper). Local and production both use `DATABASE_URL` against Neon (a dev branch locally). Docker Postgres is not required.

---

## Auth and data

### Accounts

Two users are still created at migrate/bootstrap from env:

- `AUTH_OWNER_EMAIL` / `AUTH_OWNER_PASSWORD`
- `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD` (default email `demo@atrium.local`)

Auth.js with the Credentials provider. JWT session cookie.

`User`: `id`, `email`, `passwordHash`, `tenantId`, `role` (`owner` | `demo` | `member`), `createdAt`.

Phase 6 adds flag-gated `/signup` (instant access, no mailer) and logged-in `/settings` change-password. Details: [2026-09-11-accounts-design.md](./2026-09-11-accounts-design.md).

Auth.js `Account` and `Session` tables exist in the adapter shape even if unused, so a Google provider later is an adapter add, not a schema rewrite.

Login errors: generic "Invalid email or password". Unauthenticated requests redirect to `/login` (except `/signup` and Auth.js routes).

### Tenancy

Owner tenant and demo tenant are two rows. No shared records.

Every CRM, Space, and Rolodex row has `tenant_id`. Queries take `tenantId` from the session. The client never supplies tenant id. Groove has no tenant data.

### Demo reset

Visible only when `role === demo`. Nav control: "Reset demo".

Server action: in one transaction, delete that tenant's CRM/Space/Rolodex rows, then re-seed that `tenant_id`. Owner tenant is unreachable from this path (explicit `tenant_id` + `role` check). If the transaction fails, data is left as-is; show a banner.

Reset persists during a demo until someone clicks it. Cron is optional later, not phase 0.

### Seed

Demo tenant: deterministic sample data ported from the reference seeds (orgs/contacts/deals, a few Space pages, a few Rolodex people).

Owner tenant: empty. No welcome records.

### Data flow

1. Browser hits a protected route.
2. Auth.js session cookie → user → `tenantId` + `role`.
3. Server action / route handler runs Drizzle queries with that `tenantId`.
4. JSON or RSC payload back to the app UI.
5. Groove never hits the database.

---

## Phases

Each of the four applications is a phase. Foundation is phase 0 because auth, tenancy, and the shell must exist first.

Build order is 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. One feature at a time. No parallel features that touch the same files.

### Phase 0 — Atrium platform

Next.js app, AGENTS.md, Drizzle/Postgres, Auth.js two accounts, launcher, shared nav + theme, tenant helper, Reset demo (no-op until an app has tables). Tracking files: `features/INDEX.md`, `CURRENT_FEATURE.md`, feature specs.

### Phase 1 — CRM

Organizations, contacts, deals, drag-and-drop pipeline, activities, dashboard. Tenant-scoped. Demo seed included.

Feature specs: `features/phase-1-crm/` (1.1–1.9). Board: `features/INDEX.md`.

### Phase 2 — Space

Pages + blocks, databases with table / board / list views, search. Tenant-scoped.

Feature specs: `features/phase-2-space/` (2.1–2.8). Board: `features/INDEX.md`.

### Phase 3 — Rolodex

People, circles, cadences, birthdays, conversation timeline, CSV and vCard import. Tenant-scoped. Initials only in v1 (no photo column). Last contacted and check-in status are derived, never stored.

Feature specs: `features/phase-3-rolodex/` (3.1–3.10). Design: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. Board: `features/INDEX.md`.

### Phase 4 — Groove

Four synths, one transport, master DJ filter, Web Audio only. No DB. Behind login.

Feature specs: `features/phase-4-groove/` (4.1–4.8). Design: `docs/superpowers/specs/2026-09-09-groove-design.md`. Board: `features/INDEX.md`.

### Phase 5 — Workroom (redesign)

Phases 0–4 shipped functional but visually bare: Geist + Arial fallbacks, flat near-black surfaces, no texture or motion, emoji icons in the Space tree, and placeholder empty states. Phase 5 is a single visual direction applied across the whole product. No new domains, no new databases, no new features — it re-themes and restyles what exists. Approval artifact: [docs/prototypes/2026-09-10-workroom/](../../../prototypes/2026-09-10-workroom/README.md) (a static prototype, merged in PR #46, not production code).

The direction, “the Workroom”: warm editorial rather than a generic dark dashboard.

| Element | Decision | Why |
| --- | --- | --- |
| Surfaces | Espresso / ink browns `#13100c` → `#2b251b` (dark), warm paper (light) | Personal, not corporate-dashboard |
| Ink | Warm off-white `#f0e9da`, dimmed `#a99e88` / `#7a6f5b` | Calm, readable |
| Accent | Brass `#dfa33c` — evolution of the existing amber active state | Continuity with the nav |
| Display type | Fraunces (characterful serif) for titles, KPI figures, brand | Distinctive identity |
| Body type | Geist, already loaded | No regression in readability |
| Data type | Geist Mono for labels, dates, tempo, IDs, chips | Editorial data texture |
| Theme | Dark default; light is warm “paper”, not white | Follows existing `atrium.theme` |
| Texture | Low-opacity SVG paper grain + top radial brass glow | Quiet depth, not noise |
| Motion | Staggered load reveals, nav underline sweep, card lift, animated meters. `<prefers-reduced-motion>` respected | Alive without gimmick |
| Groove | Stays instrument-dark in both themes, per its spec | Hardware panel needs contrast |

Shared presentational classes (buttons, fields, panels, KPI cards, chips, avatars, subnav, page titles) and the design tokens land in the foundation features 5.1–5.2; per-app passes (5.3–5.6) apply them to each app’s own components. The per-app CSS namespaces (`crm-`, `space-`, `rolodex-`, `groove-`) and the `atrium-nav-` prefix rule from `AGENTS.md` still hold — the prototype uses unprefixed classes because it never ships into the app.

Feature specs: `features/phase-5-workroom/` (5.1–5.7). Board: `features/INDEX.md`.

### Phase 6 — Accounts (self-serve)

Public credentials signup behind `AUTH_SIGNUP_ENABLED`, a `member` role with an empty personal tenant, and logged-in change-password. Owner and demo stay env-seeded. No mailer, OAuth, forgot-password, or extra members on a tenant.

Feature specs: `features/phase-6-accounts/` (6.1–6.4). Design: [2026-09-11-accounts-design.md](./2026-09-11-accounts-design.md). Board: `features/INDEX.md`.

### Phase 7 — Architecture (modular monolith)

Harden the structure Phases 0–6 already chose. No new product. ADRs in `docs/adr/`, demo reset as one Neon `db.batch`, `tenantId` indexes, split query modules, a client/server import fitness function. Stay one Next.js deployable on one Neon database. No RLS (neon-http cannot hold `SET LOCAL`), no session revocation (6.3), no extracting Groove, no unifying drag libraries, no TanStack Query.

Feature specs: `features/phase-7-architecture/` (7.1–7.5). Design: [2026-09-11-architecture-design.md](./2026-09-11-architecture-design.md). Board: `features/INDEX.md`.

---

## Testing and quality

Not cloning the reference implementation's course control plane.

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
| `AGENTS.md` | Stack, tenancy rule (no query without tenant_id from session), CSS scoping, TDD, do not copy the reference implementation's Express/SQLite. |
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
- Auth.js (Credentials; signup in Phase 6)
- Vitest + Playwright
- Vercel

### TanStack

The reference implementation used `@tanstack/react-table` for CRM/Space grids. Atrium does the same, and only that:

- **Table:** yes, when CRM (phase 1), Space table views (phase 2), and Rolodex People (phase 3) ship. Not in phase 0.
- **Router:** no. Next.js App Router.
- **Query:** no in v1. Server Components and server actions load and mutate data. Revisit if a screen needs rich client cache.

Do not add TanStack packages until the feature that uses them.

## Environment (phase 0)

- `DATABASE_URL` (Neon Postgres connection string)
- `AUTH_SECRET`
- `AUTH_OWNER_EMAIL` / `AUTH_OWNER_PASSWORD`
- `AUTH_DEMO_EMAIL` / `AUTH_DEMO_PASSWORD`
- `AUTH_SIGNUP_ENABLED` (Phase 6; only the string `true` opens `/signup`)
- Never commit `.env`. Example values live in `.env.example` without real passwords.

---

## Implementation sequence after this file is approved

1. writing-plans (feature spec mode): INDEX + CURRENT_FEATURE + phase 0 specs only. Later phases get specs when that phase starts, not a 40-file dump up front.
2. User confirms the phase 0 backlog.
3. subagent-driven-development: one feature at a time, spec review then quality review, controller verifies test + build.

Progress: `features/INDEX.md`. Phases 0–6 complete. Phase 7 Architecture specs 7.1–7.5 exist. Next implementable unit is 7.1, after the Phase 7 docs PR merges.
