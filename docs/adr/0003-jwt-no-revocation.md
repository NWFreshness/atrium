# ADR-0003: JWT sessions with no revocation on password change

## Status: Accepted

## Context

Auth.js Credentials signs a JWT; `auth.config.ts` sets
`session: { strategy: "jwt" }` with Auth.js's default 30-day `maxAge`. The
`jwt` callback puts `id`, `tenantId` and `role` on the token, and the `session`
callback copies them onto `session.user`. Every request reads those values from
the cookie — there is no session lookup in the database.

Phase 6.3 added change-password on `/settings`. That feature had to answer a
question it could not dodge: what happens to the sessions that were opened with
the password the user just replaced?

## Options considered (benefits / costs)

**JWT with no revocation** (chosen)

- Benefits: no session read per request — the hot path stays databaseless on a
  serverless function; `tenantId` and `role` are available to every route
  without a query; nothing to clean up, no session table to keep in sync.
- Costs: a successful password change does **not** invalidate existing JWTs.
  A lost or shared device stays signed in for up to 30 days, and
  "sign out everywhere" cannot be built without new machinery.

**Database sessions** (Auth.js `strategy: "database"`; the `sessions` table is
already in the schema — kept so OAuth can be added later, per the parent design)

- Benefits: revocation is deleting a row; sessions are server-controlled and
  enumerable; a password change can drop them all in one statement.
- Costs: a database round trip on every authenticated request on a serverless
  function; the adapter path is currently unused, so it is new code plus a
  migration; and it still needs a product decision and a UI ("sign out every
  device?") that no spec asks for.

**A token-version or `passwordChangedAt` claim on the JWT**

- Benefits: revokes on change while keeping JWTs; targeted (can keep the
  current device and drop the rest).
- Costs: verifying the claim means reading the user row per request — which is
  the database round trip the JWT was chosen to avoid — unless it is cached, at
  which point the revocation window equals the cache TTL; also the claim is
  dead code today, and the `sessions`-table alternative is simpler for the same
  outcome.

## Decision

Keep JWT sessions and add no revocation. `tenantId` and `role` live on the
token; a password change leaves every existing cookie valid until it expires
(Auth.js's default 30 days). This is a deliberate, stated limit, not an
oversight: `/settings` says the password changed and does not imply that other
devices were signed out.

## Consequences (+ / −)

- **+** The authenticated hot path performs no session query; auth works on any
  serverless instance without shared state.
- **+** No session table maintenance, no cleanup job, no revocation list.
- **−** Changed credentials do not cut off existing sessions — the primary
  reason a user changes a password after a compromise is not satisfied by this
  decision alone.
- **−** "Sign out everywhere" and per-device session management require new
  machinery: either database sessions or a token version with a per-request
  check.
- **−** The window is 30 days by default and is not configurable from the UI;
  shortening it is the only cheap lever this design has.

## Reversal trigger

A stolen-cookie incident in production, or a product request for "sign out
everywhere" / device management. Either one reopens this ADR and leads to
database sessions or a token-version claim — decided in a spec, with the
per-request cost measured.
