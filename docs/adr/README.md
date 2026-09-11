# Architecture Decision Records

Why this directory exists: the expensive choices in Atrium were made in chat, in
`HANDOFF.md`, and in feature "shipped notes" — all of which are history, not
decisions. An ADR states one decision, the options that lost, and the evidence
that would make us change our mind.

**Authority:** [2026-09-11-architecture-design.md](../superpowers/specs/2026-09-11-architecture-design.md)
is the phase design and outranks these records: if an ADR and it disagree, fix
the ADR — or, if the decision genuinely moved, amend the design first (the rule
the design itself applies to feature specs). Product-level design is
[2026-09-06-atrium-design.md](../superpowers/specs/2026-09-06-atrium-design.md).

## Index

| ADR                                        | Decision                                               | Status   | Governs                                                              |
| ------------------------------------------ | ------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| [ADR-0001](./0001-modular-monolith.md)     | Modular monolith on Next.js and Neon                   | Accepted | `app/`, `lib/`, one Vercel project, one database                     |
| [ADR-0002](./0002-neon-http-batch.md)      | neon-http with `db.batch`, no interactive transactions | Accepted | `lib/db/index.ts`, `lib/auth/signup.ts`, `lib/tenancy/reset-demo.ts` |
| [ADR-0003](./0003-jwt-no-revocation.md)    | JWT sessions with no revocation on password change     | Accepted | `auth.ts`, `auth.config.ts`, `app/(authenticated)/settings/`         |
| [ADR-0004](./0004-groove-has-no-tables.md) | Groove has no tables                                   | Accepted | `lib/groove/**`, `components/groove/**`                              |
| [ADR-0005](./0005-signup-fail-closed.md)   | Signup fails closed; flag-reading pages are dynamic    | Accepted | `lib/auth/signup.ts`, `app/login/`, `app/signup/`                    |
| [ADR-0006](./0006-application-tenancy.md)  | Application-level tenancy; RLS deferred                | Accepted | `lib/tenancy/`, `lib/*/queries.ts`, every `tenantId` column          |

## Shape of an ADR

```
# ADR-NNNN: <title>
## Status: Accepted
## Context
## Options considered (benefits / costs)
## Decision
## Consequences (+ / −)
## Reversal trigger
```

One decision per file. The "reversal trigger" is not decoration: it names the
event (a measurement, an incident, a new driver capability, a product request)
that reopens the decision, so a future session can tell "we chose this" apart
from "nobody thought about it".

To add one: take the next free number, copy the shape above, keep it under about
80 lines, and add the row to the index. Use `Superseded by ADR-NNNN` in the
status line of the record you replace rather than editing its decision — the
reasoning that was wrong is part of the record. Do not add ADRs for decisions
this product has not made.

---

## C4 — level 1: system context

Who uses Atrium, what it is, and what it depends on.

```
   ┌───────────┐        ┌───────────┐        ┌───────────┐
   │   Owner   │        │   Demo    │        │  Member   │
   │ env-seeded│        │ env-seeded│        │ self-serve│
   │ empty     │        │ seeded    │        │ own empty │
   │ tenant    │        │ tenant    │        │ tenant    │
   └─────┬─────┘        └─────┬─────┘        └─────┬─────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │  (1)
                              ▼
                 ┌────────────────────────────┐
                 │           Atrium           │
                 │     Next.js deployable     │
                 │  CRM · Space · Rolodex ·   │
                 │           Groove           │
                 └──────────────┬─────────────┘
                                │  (2)
                                ▼
                 ┌────────────────────────────┐
                 │       Neon Postgres        │
                 │  tenants, users, and the   │
                 │  tenant-scoped CRM, Space  │
                 │  and Rolodex rows          │
                 └────────────────────────────┘
```

| Element       | Responsibility                                                                                    | Protocol on the arrow                                               |
| ------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Owner         | One env-seeded account with an empty tenant. No Reset demo (that is `role === "demo"` only).      | —                                                                   |
| Demo          | One env-seeded account whose tenant carries the demo seed; the only role that may run Reset demo. | —                                                                   |
| Member        | Created by `/signup` when `AUTH_SIGNUP_ENABLED=true`; one empty tenant, same shape as owner.      | —                                                                   |
| Atrium        | The whole product: four apps, one deployable, one session, one tenancy model.                     | (1) HTTPS, with an Auth.js JWT session cookie (ADR-0003)            |
| Neon Postgres | The only durable state. One database holding `tenants`, `users`, and every tenant-scoped row.     | (2) Neon HTTP over HTTPS through `drizzle-orm/neon-http` (ADR-0002) |

Not drawn because they are not systems: the browser's Web Audio API is reached
in-process by Groove (no network, no data), so it is an annotation on the
container view below rather than an arrow. There is no third-party service,
mailer, queue, cache or blob store in the product.

## C4 — level 2: containers

What runs, and which protocol connects it.

```
        ┌──────────────────────────────────────────────────────────┐
        │  Browser JavaScript                                      │
        │  React client components for all four apps. The Groove    │
        │  engine (`lib/groove/audio/*`) synthesises sound here     │
        │  through the Web Audio API — in-process, no network.      │
        │  No database client and no `tenantId`; the client chunk    │
        │  must not carry Drizzle (7.5 — `/rolodex/circles` leaks   │
        │  it today via `move-person.ts` → `queries.ts`).           │
        └───────────────┬──────────────────────▲───────────────────┘
                        │ (1)                  │ (3)
                        ▼                      │
        ┌───────────────┴──────────────────────┴───────────────────┐
        │  Next.js application — the only deployable                │
        │  RSC pages · server actions · middleware · Auth.js JWT    │
        └───────────────┬──────────────────────────────────────────┘
                        │ (2)
                        ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Neon Postgres                                            │
        │  Reached only from the Next.js application.               │
        └──────────────────────────────────────────────────────────┘
```

| Container           | Responsibility                                                                                                                                          | Protocol on the arrow                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Browser JavaScript  | Renders the client components of CRM, Space, Rolodex and Groove; owns the Groove engine, which is the only code that touches the Web Audio API.         | (1) HTTPS: RSC payloads and server-action POSTs, carrying the session JWT cookie                                               |
| Next.js application | One deployable on Vercel: renders every route, owns all reads and writes, authenticates the session, and is the only thing that can reach the database. | (3) HTTP responses carrying the client bundle; the Groove engine is constructed on a user gesture (ADR-0004)                   |
| Neon Postgres       | One database: `tenants`, `users`, and the tenant-scoped rows of CRM, Space and Rolodex.                                                                 | (2) Neon HTTP over HTTPS via `drizzle-orm/neon-http`; multi-statement writes use `db.batch` — no `db.transaction()` (ADR-0002) |

### Modules inside the deployable (not services)

These are folders, not containers. They are deployable together by design
(ADR-0001).

- **Platform** — `lib/auth`, `lib/db`, `lib/tenancy`, `auth.ts`, `auth.config.ts`,
  `middleware.ts`, `components/atrium-nav*`: sessions, tenancy, the schema
  barrel, the top nav and the reset hook.
- **CRM** — `lib/crm` (schema, queries, actions, seed, reset) and
  `components/crm`; routes under `app/(authenticated)/crm`.
- **Space** — `lib/space` and `components/space`; routes under
  `app/(authenticated)/space`.
- **Rolodex** — `lib/rolodex` and `components/rolodex`; routes under
  `app/(authenticated)/rolodex`.
- **Groove** — `lib/groove` (pure TypeScript domain) plus `lib/groove/audio`
  (imported only from `"use client"` modules) and `components/groove`; route
  `app/(authenticated)/groove`. It owns no tables and no `tenantId` (ADR-0004).

### Data ownership and quantum

One user owns one tenant; `requireTenant()` reads `tenantId` from the session and
is the only source of it (ADR-0006). CRM, Space and Rolodex rows carry that id;
Groove owns nothing.

The architectural quantum is **the whole application plus the shared database**:
a schema change is system-wide, and a change to a shared module is a
whole-product change. That is the deliberate consequence of ADR-0001.

### Deliberately absent

No message queue, no cache layer, no search service, no second database, no
per-app deployables, no row-level security (until a driver can hold the
per-request setting), no session store (JWTs are stateless), no mailer, no OAuth
provider, and no media/blob storage — Rolodex contacts are initials only. Each
of these is a decision to add later if a spec asks, not an oversight.
