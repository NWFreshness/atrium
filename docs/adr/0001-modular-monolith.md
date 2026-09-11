# ADR-0001: Modular monolith on Next.js and Neon

## Status: Accepted

## Context

Atrium ships four products (CRM, Space, Rolodex, Groove) from one Next.js App
Router project, deployed as one Vercel project, against one Neon Postgres
database. The four apps share auth, the session, the tenant model and the top
nav. Groove is a client-only Web Audio instrument inside the same deploy.

The reference implementation this product follows is an Express + SQLite app:
a Node server process and a file database. That shape was rejected at Phase 0,
before any CRM row existed, because the hosting target has no durable writable
disk.

## Options considered (benefits / costs)

**One Next.js deployable, one Postgres database** (chosen)

- Benefits: one deploy, one CI pipeline, one migration path; auth and
  `tenantId` are shared values rather than network calls; cross-app links (the
  top nav, the launcher) are ordinary rendered routes; one release train means
  a shared change lands everywhere at once instead of version-skewing.
- Costs: a change to a shared module is a whole-product change; no per-app
  scaling or independent deploy; the client bundles share a build (Groove's
  audio code is compiled by the same `next build` as CRM's tables); the blast
  radius of one bad migration is every app.

**Express + SQLite, matching the reference implementation**

- Benefits: simplest local development (a file, no server to provision); the
  jobs-to-be-done port maps one-to-one onto the reference's routes and schema.
- Costs: Vercel gives a serverless function no durable writable disk, so SQLite
  cannot persist there — the app would not survive its first request in
  production; it would also discard the auth, tenancy and migration work Phase 0
  had already shipped. It is a rewrite dressed as a simplification.

**Four per-app services (or a package per app) over a shared Postgres**

- Benefits: independent deploy and scale, a failure in one app does not take the
  others down, smaller bundles, per-app ownership boundaries.
- Costs: there is no independent team, no independent scale need, and no
  independent release cadence to serve; the services would still share one
  database and one auth system, so "independence" would be partial — the hard
  coupling (schema, tenancy) stays; and every function call would become a
  network call with its own failure modes and observability burden.

## Decision

Stay a modular monolith: one Next.js deployable, one Neon Postgres database,
four module folders (`lib/crm`, `lib/space`, `lib/rolodex`, `lib/groove` plus
`components/<app>`). Folders are modules, not services. The architectural
quantum is the whole app plus the shared database — a schema change is
system-wide by design, and that is acceptable at this size.

## Consequences (+ / −)

- **+** One deploy, one CI pipeline, one migration path, one release train.
- **+** Auth, `tenantId` and nav are shared in-process; no service discovery,
  no inter-service auth, no distributed transaction.
- **+** Refactoring across apps is cheap — a helper can move between modules in
  one commit.
- **−** No independent deploy or scale; a shared-module change is a
  whole-product change.
- **−** Per-app code-splitting is a client-bundle concern, not a runtime
  boundary: Groove's audio engine is in the same build, kept out of other
  routes only by import discipline (Phase 7.5 makes that a rule with a test).
- **−** The quality of the module boundaries is enforced by review and tests,
  not by the deploy topology.

## Reversal trigger

Extract an app (a new phase, not a silent service) when one of these becomes
true: Groove's client code shows up in a non-Groove route's initial JS or adds
more than ~50 kB gzip to it (measure it in the build output); a second team needs
an independent release cadence; or a compliance boundary requires separate data.
Until then, "we could split later" is not a reason to split now.
