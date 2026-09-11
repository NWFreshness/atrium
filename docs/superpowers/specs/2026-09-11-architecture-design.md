# Architecture Design (Phase 7)

**Date:** 2026-09-11
**Status:** approved
**Product:** Atrium / Architecture
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)

If this file and a later feature spec disagree, update this file first.

---

## Problem

Phases 0–6 shipped four apps in one Next.js deployable on one Neon database. That style is right. The expensive structure has drifted from the claims in the parent design:

- Demo reset is documented as one transaction that leaves data as-is on failure. Production `resetDemo` injects no transaction; `defaultRunInTransaction` is `await work(undefined)`. CRM then deletes row-by-row over HTTP. A mid-loop failure leaves a half-wiped demo tenant.
- Every CRM, Space, and Rolodex table has `tenantId`. None of those columns are indexed. Isolation is “every helper remembered to AND `tenantId`.”
- `lib/crm/queries.ts`, `lib/space/queries.ts`, and `lib/rolodex/queries.ts` are 900–1200 line files that mix types, the memory store, and Drizzle.
- Client components can pull Drizzle into the browser by value-importing those query modules. `/rolodex/circles` already does, via `move-person.ts` → `queries.ts`.
- Expensive decisions live in HANDOFF, shipped notes, and chat. There are no ADRs.

This phase hardens the modular monolith. It does not add a product, a service, or a new auth library.

## Users

Unchanged. Owner, demo, and member. No new role.

## Job

Make the architecture we already chose observable and true: one deployable, four module folders, session `tenantId`, neon-http `db.batch` for multi-statement writes, Groove still off the database.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Style | Stay a modular monolith | Hosting on Vercel forced Next + Neon; one builder; no independent scale/security/team per app |
| First split | None this phase | Groove still needs login; CRM vs Rolodex share tenancy and a release train |
| Driver | Keep `drizzle-orm/neon-http` | Vercel has no sticky TCP pool; signup already uses `db.batch`; switching drivers is a different phase |
| Demo reset | One Neon HTTP batch for wipe + reseed of CRM, Space, and Rolodex | The parent design already promised this; the no-op `runInTransaction` is a bug |
| CRM wipe | `DELETE WHERE tenantId` like Space/Rolodex | Per-row `list` + `delete` is the slow half-wipe |
| Tenant indexes | B-tree on `tenantId` for every tenant-scoped table, including `users` | List/reset/filter all predicate on it; cheap now |
| RLS | Out | neon-http does not keep `SET LOCAL` / GUC across requests; RLS with `current_setting('app.tenant_id')` needs a connection that survives, which this driver does not |
| Query files | Split memory vs Drizzle inside each app; `queries.ts` stays the public barrel | Callers (`*-actions`, tests) must not churn; a 1.2k-line file is how a module becomes mud |
| Client boundary | Source-grep: `components/` must not value-import `queries.ts`, `schema.ts`, `lib/db`, seed, or reset | `import type` is fine; `"use server"` actions are fine; the circles-board leak is the proof |
| ADRs | `docs/adr/NNNN-slug.md`, six accepted records of decisions already shipped | Why is the asset; HANDOFF is not a decision log |
| Session revocation | Out | Locked in 6.3; other devices keep the 30-day JWT |
| Extract Groove / unify dnd / TanStack Query | Out | No user outcome; AGENTS.md already says copy the spec’s drag library |

## Non-goals (this phase)

- Postgres RLS, `SET LOCAL`, or a pooled/WebSocket Neon driver
- Session revocation, `passwordChangedAt`, “sign out everywhere”
- Case-insensitive `users.email` unique index (still the 6.1 race; not this phase)
- Per-app deployables, microservices, event bus, hexagonal ports
- Extracting Groove, unifying `@hello-pangea/dnd` and `@dnd-kit`
- TanStack Query, replacing Auth.js, renaming `middleware.ts` to `proxy`
- New product features, new tables besides indexes, new env vars
- Multi-member tenants, OAuth, mailer

## Architecture (current)

One Next.js App Router app. One Vercel project. One Postgres database. Groove is a client-only plugin in the same deploy.

Context: Owner / Demo / Member → Atrium. Atrium → Neon Postgres (HTTP). Browser → Web Audio (Groove only).

Containers:

- Next.js (RSC, server actions, Auth.js JWT cookie) — the only deployable
- Neon Postgres via `drizzle-orm/neon-http` — sync, no `db.transaction()`
- Browser JS — Groove engine; no DB

Components inside Next.js (keep):

- Platform: `lib/auth`, `lib/db`, `lib/tenancy`, `middleware.ts`, `atrium-nav`
- CRM / Space / Rolodex: `schema`, `queries`, `*-actions`, `seed`, `reset`, `components/<app>`
- Groove: `lib/groove` (pure) + `lib/groove/audio` (`"use client"` only)

Architectural quantum: the whole app + the shared database. A schema change is system-wide. Folders are modules, not services.

Data ownership: 1 user : 1 tenant. CRM, Space, and Rolodex rows carry that `tenantId` from the session. Groove owns nothing.

Hard workflow: demo reset — sync, intended-atomic, orchestrated. Signup already uses the correct neon-http form (`db.batch`, ids in app code). Reset must match.

## Auth and data

No schema shape change except indexes on existing `tenantId` columns. `requireTenant` stays the only source of `tenantId`. Client still never supplies it. Reset demo stays `role === "demo"` only.

`db.transaction()` remains forbidden on this driver. Multi-statement writes use `db.batch([...])`. Generate ids in application code before building the batch.

## Flows

**Demo reset (after 7.2).** Demo user clicks Reset demo. Server action calls `resetDemo(() => auth())` with a Neon batch transaction. CRM, Space, and Rolodex wipe that `tenantId` then reseed inside that batch. Any statement failure rolls the batch back; the tenant looks as it did before the click. Owner and member still cannot run it.

**List/query (after 7.3).** Unchanged SQL predicates; Postgres can use the `tenantId` index.

**Client load (after 7.5).** `/rolodex/circles` (and every other `components/` module) ships without `drizzle-orm` / `@neondatabase/serverless` in its client chunk.

## Chrome

None. No new routes, tabs, or copy. Reset demo button behaviour is the same; only the write path behind it changes.

## Abuse

Tenant isolation stays application-enforced (`requireTenant` + `tenantId` on every query). RLS is not a backstop this phase. Residual risk: one missed `AND tenantId` is a cross-tenant read. Accept until a driver that can hold GUC exists. Indexes do not change that risk; they change list performance as member tenants grow.

## Phases

Feature specs: `features/phase-7-architecture/` (7.1–7.5). Board: `features/INDEX.md`.

| ID | Feature |
| --- | --- |
| 7.1 | Architecture ADRs in `docs/adr/` (six accepted records + a short C4). No code. |
| 7.2 | Atomic demo reset: Neon `db.batch` for wipe+reseed; CRM wipe by `tenantId`. |
| 7.3 | `tenantId` indexes on every tenant-scoped table. |
| 7.4 | Split CRM/Space/Rolodex query modules (memory vs Drizzle); `queries.ts` remains the barrel. |
| 7.5 | Client/server import boundary: source-grep + fix the Rolodex circles leak. |

Long pole: 7.1 → 7.2 → 7.3 → 7.4 → 7.5. Do not parallel. Implement only after this docs PR merges; start at 7.1 from `main`.
