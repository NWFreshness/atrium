# ADR-0006: Application-level tenancy, RLS deferred

## Status: Accepted

## Context

One user owns one tenant. CRM, Space and Rolodex rows carry a `tenantId`, and so
does `users`. The session JWT holds `tenantId` and `role`, and `requireTenant()`
is the only source of a tenant id in application code — never the request body
or query string (AGENTS.md states this as a hard rule). Every query helper takes
`tenantId` first and throws on a missing or blank value, so isolation holds only
as long as every statement includes `AND tenantId = …`.

Postgres row-level security would be the database-level backstop. It is not
installed because of a driver constraint, not a preference:
`drizzle-orm/neon-http` (ADR-0002) sends each statement over HTTP with no
connection persisting between them, so `SET LOCAL app.tenant_id = …` cannot
survive to the next statement, and a policy reading
`current_setting('app.tenant_id')` would have nothing to read.

## Options considered (benefits / costs)

**Application tenancy — one predicate in every helper** (chosen; Phase 7.3 adds a
`tenantId` index for the cost of the predicate, not its correctness)

- Benefits: one mechanism, uniform across all three data apps; testable with a
  memory repository and no database; the predicate sits in the function that
  shapes the query, so it is visible in review and in the diff.
- Costs: the database stops nothing — one forgotten `AND tenantId` is a real
  cross-tenant read or write, and the guarantee is only as strong as review plus
  tests; the risk grows with the number of helpers (three query modules today,
  900–1250 lines each, which Phase 7.4 splits).

**Row-level security with `SET LOCAL app.tenant_id`**

- Benefits: a database-level backstop — a missed predicate returns zero rows
  instead of another tenant's, which is the one bug class that matters most here.
- Costs: the HTTP driver cannot persist the GUC between statements, so a policy
  would evaluate against an empty (or stale) setting — a false sense of safety,
  and one that unit tests, which run with no `DATABASE_URL`, never exercise. The
  variants (a role per tenant, a connection-scoped setting) all need a connection
  that survives the request, i.e. a re-platform.

**Mandatory `tenantId` parameter plus an import-boundary rule**

- Benefits: cheap, no infrastructure; also catches the second failure mode — a
  client component supplying the id, or a helper growing an optional one.
- Costs: a convention, not a guarantee: it makes the missing predicate less
  likely, never impossible. Adopted as a complement, not as the decision.

## Decision

Tenant isolation stays application-enforced. `requireTenant()` reads `tenantId`
from the session and is the only source; every query helper takes `tenantId`
first and throws when it is missing or blank; the client never supplies it.

RLS is deferred, not rejected on principle — this driver cannot hold the
per-request setting it requires. Phase 7.3 indexes every tenant-scoped `tenantId`
column so the predicate stays cheap for list, filter and reset as member tenants
grow; an index changes the cost of a scan, not who can read what.

## Consequences (+ / −)

- **+** One isolation mechanism everywhere, testable without a database and
  visible in the function that builds the query.
- **+** No dependency on driver features the deploy target does not have.
- **−** RLS is not a backstop: a missed `AND tenantId` is a genuine cross-tenant
  read, detectable only by a test or a user.
- **−** The indexes make a bad query fast as well as wrong; they are a
  performance decision and must never be described as isolation.
- **−** Review must keep watching for two specific mistakes: a query with no
  tenant predicate, and a `tenantId` that arrived from the client.

## Reversal trigger

A driver that can hold a per-request GUC (a pooled or connection-scoped Neon
driver adopted in a spec), or a missed-predicate incident in production that we
decide to backstop in Postgres. Either one is a phase whose policies need
integration tests against a real database, not unit tests.
