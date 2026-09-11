# ADR-0005: Signup fails closed, and flag-reading pages are dynamic

## Status: Accepted

## Context

Phase 6 added self-serve signup behind `AUTH_SIGNUP_ENABLED`, read as
`env.AUTH_SIGNUP_ENABLED === "true"` in `lib/auth/signup.ts`. The deploy is
public, so the flag is a kill switch on account creation. Two Next.js behaviours
make the naive implementation wrong:

- A page with no dynamic API is **prerendered at build time**, so a flag read
  during render is baked into the served HTML: a build with signups off keeps
  serving "closed" after the flag is turned on, and a build with them on cannot
  be closed without a redeploy.
- A server action is a POST endpoint reachable without rendering the page, so a
  check that lives only in the page render is no check at all.

## Options considered (benefits / costs)

**Fail closed, read per request, force the flag-reading pages dynamic** (chosen)

- Benefits: the default (missing variable, typo, empty string, `"1"`, `"TRUE"`)
  is closed — opening the door takes an explicit `"true"`; flipping the flag
  takes effect on the next request, with no redeploy.
- Costs: the flag must be read per request, and every page branching on it must
  remember `export const dynamic = "force-dynamic"` — a mistake unit tests
  cannot observe, because Vitest never prerenders. It needs a source-grep test
  and the build's route table (`ƒ /signup`, not `○ /signup`).

**Default open**

- Benefits: nothing to configure for local development or a demo deploy.
- Costs: a misconfigured environment opens public account creation by omission —
  a security posture chosen by forgetting, on a public URL.

**Cache it, or move the flag into the database**

- Benefits: a stored setting could be changed without a deploy, and a cached
  read is marginally cheaper.
- Costs: a cached read in a prerendered page freezes at build time — the bug it
  was meant to avoid; a stored setting needs a table, a cache, a migration and a
  UI for one env variable, and cannot answer before a database connection exists.

## Decision

Signup fails closed and is evaluated per request:

- Only the exact string `"true"` opens it; anything else — including a missing
  variable — is closed.
- `app/login/page.tsx` and `app/signup/page.tsx` both export
  `export const dynamic = "force-dynamic"`; the login footer link is
  flag-dependent too.
- The signup server action re-checks the flag before doing any work, so a
  hand-rolled POST is closed even though no page rendered.
- Default dependencies are built lazily (`createDefaultSignUpDeps()`), so a
  closed signup with no `DATABASE_URL` answers `closed` rather than throwing a
  database error.

## Consequences (+ / −)

- **+** The unsafe state requires an explicit opt-in, and the flag can be
  flipped both ways without a redeploy.
- **+** A direct POST cannot bypass the flag: the action, not the page, is the
  gate.
- **−** Every page branching on the flag must be dynamic; forgetting silently
  freezes the build-time value, and only a source-grep test plus the route table
  catches it.
- **−** One Next process cannot flip the flag, so the Playwright suite runs
  twice: flag off (closed UI asserted, journeys skipped) and flag on (journeys
  run, the closed test skips). The flag is deliberately not forced in
  `playwright.config.ts`, because `npm run dev` inherits the runner's environment
  and that would change every other spec's `/login`.

## Reversal trigger

Signup becomes permanently on, or a mailer adds invite-only flows. Then the flag
and the open/closed copy come out of the product — but not the runtime reads: a
page that branches on environment configuration must still be dynamic.
