# ADR-0002: neon-http with `db.batch`, no interactive transactions

## Status: Accepted

## Context

`lib/db/index.ts` builds the database with `drizzle-orm/neon-http` over Neon's
HTTP driver. The deploy target is serverless: functions are short-lived and
there is no sticky TCP connection to hold.

Two writes here are genuinely multi-statement:

- **Signup** creates a `tenants` row and a `users` row that must both exist or
  neither; a half-write leaves an orphan tenant nothing can reach.
- **Reset demo** must wipe a tenant's CRM, Space and Rolodex rows and reseed
  them as one unit, so a failure leaves the tenant as it was.

The HTTP driver has no interactive transactions: `db.transaction()` does not
merely fail to compile, it throws `No transactions support in neon-http driver`
at runtime.

## Options considered (benefits / costs)

**`drizzle-orm/neon-http` with `db.batch([...])`** (chosen)

- Benefits: the only form that fits the deploy target — no pool to size, no
  connection to leak; `batch` sends the array to Neon's transaction endpoint, so
  it commits together and rolls back on failure; one database path for the whole
  product.
- Costs: no interactive transaction anywhere — you cannot read a row and decide
  the next statement inside one; every statement must be fully built (ids
  included) before any of them runs, so a child id is generated in application
  code (`crypto.randomUUID()`) rather than by a column default; the constraint is
  a convention reviewers must know, because violating it is a runtime throw.

**`@neondatabase/serverless` Pool (WebSocket) with a real `db.transaction()`**

- Benefits: interactive transactions, and a connection that can hold
  `SET LOCAL` — which would make row-level security possible (ADR-0006).
- Costs: per-request pool setup and worse cold starts in a serverless function,
  a transaction held open across `await`s that may be frozen mid-flight, and
  different failure modes for a write volume that does not need them.

**`postgres.js` / `node-postgres` over TCP**

- Benefits: familiar, interactive transactions, no vendor-specific API.
- Costs: not viable on Vercel without an external pooler — new infrastructure to
  run and pay for; a re-platform, not a swap.

**Application-level compensation (catch the error, delete the orphan row)**

- Benefits: no driver constraint.
- Costs: the failure path can itself fail, and the window between the two writes
  is visible to concurrent readers — strictly worse than an atomic batch.

## Decision

Keep `drizzle-orm/neon-http`. Every multi-statement write goes through
`db.batch([...])`, with ids generated in application code and passed explicitly
to each statement. `db.transaction()` is forbidden on this stack.

## Consequences (+ / −)

- **+** One database path; nothing to pool, nothing to leak, deployed as-is.
- **+** Signup is atomic on the real path — `lib/auth/signup.ts` already batches.
- **−** No interactive transactions; work that seems to need one must be
  redesigned (decide first, then batch the writes).
- **−** Row-level security is out of reach, because it needs a `SET LOCAL` that
  survives between statements (ADR-0006).
- **−** A `db.transaction()` call is a runtime error, not a compile error.
- **−** Known deviation, closed by 7.2: `resetDemo` used to run its wipes through
  a no-op `defaultRunInTransaction` (`await work(undefined)`), so a mid-reset
  failure could leave a half-wiped demo tenant. The production runner now collects
  every wipe and reseed statement and sends them as one `db.batch`.

## Reversal trigger

Leave Vercel for a long-lived Node host, or adopt a Neon driver that offers
interactive transactions (pooled or WebSocket) in a spec of its own — a phase
with its own migration and tests, not a driver tweak.
