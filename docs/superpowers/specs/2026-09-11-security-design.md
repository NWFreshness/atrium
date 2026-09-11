# Security Design (Phase 9)

**Date:** 2026-09-11
**Status:** approved
**Product:** Atrium / Security
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)

If this file and a later feature spec disagree, update this file first.

---

## Problem

Phases 0–8 shipped four apps, flag-gated signup, a modular monolith, and three integrity holes that had been named. The next change is not a fifth app and not another architecture pass.

A defensive review of the live tree (CIA of tenant CRM / Space / Rolodex data and of credentials; trust boundary = every browser POST and every search string) found six holes that are still shallow:

- **Known CVE in production deps.** `drizzle-orm@^0.44.7` resolves below 0.45.2. GHSA-gpj5-g38j-94v9 (HIGH) is identifier-escape in `sql.identifier()` / `.as()`. Atrium does not pass request input to those APIs today (`orderBy` uses column objects), so the live path is not the advisory’s example — shipping a known HIGH anyway is the Equifax pattern. CI does not run `npm audit`. Nested `drizzle-kit` → `esbuild` is moderate and **dev-only**.
- **No isolation headers.** `next.config.ts` only sets `allowedDevOrigins`. No `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`, `Permissions-Policy`, or HSTS. Clickjacking and MIME-sniff are open in the browser.
- **Login timing oracle.** `authorizeCredentials` returns `null` without calling `verify` when `findByEmail` misses. Duplicate-email copy is already generic; wall-clock bcrypt vs a missing-row return still advertises which addresses exist.
- **No throttle.** Phase 6 named this residual: when `AUTH_SIGNUP_ENABLED=true`, bots can open empty tenants; login is always on and can be stuffed. Nothing counts failures.
- **Unbounded Rolodex import.** `parseImportForSession` takes the whole file as a string; `applyImport` loops `createPerson` with no row or byte cap. An authenticated member can pin Neon and the server with one POST.
- **Unbounded stored text and raw LIKE.** Names, notes, and Space blocks are `text` with no application ceiling. Search builds `ilike(col, '%' + term + '%')` with the term bound (not SQL-injected) but `%` / `_` in the query are still LIKE metacharacters, so a one-character search of `%` is “return everything.”

This phase closes those six. It does not add a product, a service, RLS, or session revocation.

## Users

Unchanged. Owner, demo, and member. No new role.

## Job

Callers of login, signup, import, search, and create/update should not have to know about a bcrypt timing gap, a missing header, an unbounded file, or a LIKE wildcard. The platform owns those limits.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Phase job | Close named AppSec holes, not a new app | Phase 7 already hardened the monolith; Phase 8 closed claimed interfaces. This is shift-left on what is still open |
| SCA | Bump `drizzle-orm` to `^0.45.2`. CI `npm audit --omit=dev --audit-level=high` | Production HIGH must fail the PR. Dev-only esbuild under drizzle-kit is waived in the spec, with the reason, not silently ignored |
| Isolation headers | `next.config.ts` `headers()` on `/:path*` | Does not require renaming `middleware.ts`. Vercel will forward them |
| CSP | `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'` only | A `script-src` policy that covers Next hydration **and** the inline theme init script needs a nonce, which is the middleware file. Leave `script-src` out until a feature has to touch that file |
| Cookie flags | Leave Auth.js defaults | JWT cookies are already HttpOnly + SameSite=lax + Secure in production. Restating them is theater |
| Session TTL / revocation | Out | ADR-0003 / 6.3: no revocation list, no `passwordChangedAt`. Do not shorten `maxAge` in this phase |
| Login timing | Always `verify` against a stored dummy bcrypt hash when the user is missing | Same code path as a wrong password. Dummy hash is a module constant, not hashed per request |
| Throttle store | Neon table `auth_throttles`, no `tenantId` | Vercel is serverless; an in-process Map is per-isolate theater. Auth is pre-tenant, so this table is not in the 7.3 tenant-index set |
| Throttle keys | `email:` + `lower(email)` and, when the request has an IP, `ip:` + that address | Email key stops stuffing one mailbox. IP key stops spraying many mailboxes from one client. Missing IP (unit tests, odd runtimes) degrades to email-only |
| Throttle limits | 5 failures / 15 min per email, 20 / 15 min per IP. Success deletes the row | Small enough to stop a bot, large enough that a human typo still works. Constants in code, no new env var |
| Throttle copy | Same generic strings as today | A distinct “too many attempts” line is a new oracle (that address is being guessed) |
| Import caps | 1_000_000 UTF-16 units of file text, 500 people per apply, field ceilings | Authenticated DoS, not an anonymous one. Numbers are constants next to the parser |
| Text ceilings | One helper in `lib/input/text.ts`, called from the three query barrels when they build a row | Memory and Drizzle both see it. Search escapes `\`, `%`, `_` before wrapping in `%…%` |
| `middleware.ts` → `proxy` | Out | Next 16 deprecation; not required for `headers()` |
| RLS / revocation / OAuth / mailer / MFA / CAPTCHA | Out | Locked in 6.x / 7.x, or product expansion. No reversal trigger has fired |

## Non-goals (this phase)

- Postgres RLS, `SET LOCAL`, a pooled/WebSocket Neon driver
- Session revocation, `passwordChangedAt`, “sign out everywhere”, changing JWT `maxAge`
- OAuth, mailer, forgot-password, delete account, change-email, MFA, CAPTCHA
- A `script-src` CSP / nonce middleware, renaming `middleware.ts` to `proxy`
- Unifying `*ForSession` / `*Action`, extracting Groove, TanStack Query
- A source-grep that every Drizzle `where` mentions `tenantId` (no known missed predicate; `scopedId` in all three drizzle modules already `and(eq(tenantId), eq(id))`)
- Failing CI on drizzle-kit’s nested esbuild (devDependency, not the Vercel runtime)
- WAF / CDN / volumetric DDoS beyond Vercel’s edge
- Logging plaintext emails, passwords, or `AUTH_SECRET`

## Architecture (current)

Unchanged from [Phase 7](./2026-09-11-architecture-design.md). One Next.js deployable, one Neon database, Groove client-only, application tenancy, neon-http `db.batch`.

This phase adds one non-tenant table (`auth_throttles`) and does not change the driver, the auth library, or the four apps’ schemas.

## Auth and data

`auth_throttles`: `id` (uuid), `subject` (text, the `email:` / `ip:` key), `failedCount` (integer), `windowStartedAt` (timestamptz), unique on `subject`. No `tenantId`. Not demo-reset. Not in the 7.3 index list.

Login and signup call one helper `assertNotThrottled(subject)` then `recordFailure` / `clearFailures`. The helper is injectable so unit tests never need Neon.

`authorizeCredentials` always calls `verify(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)`.

Browser headers live in `next.config.ts`. They are not a Next middleware matcher exception.

Import caps live next to `parseCSV` / `parseVcf` / `applyImport`. The dialog does not re-implement them; the server action is the rule.

Text ceilings live in `lib/input/text.ts`. Query barrels call them while constructing the row, before memory/Drizzle dispatch.

## Flows

**Login, unknown email (after 9.3).** Same generic “Invalid email or password”. `verify` still ran.

**Login, fifth failure in 15 minutes (after 9.4).** Same generic copy. No row is authenticated. A sixth attempt in the window is refused before bcrypt. A success inside the window deletes the throttle row.

**Signup, flag on, same mailbox stuffed (after 9.4).** Generic `unavailable` / “Could not create account.” No new tenant.

**Import, 501st person or a 1_000_001-character paste (after 9.5).** `{ error: "That file is too large." }` (or the apply equivalent). No partial insert from that call.

**Search `q=%` (after 9.6).** Matches rows whose name contains a literal `%`, not every row.

## Chrome

None. No new routes, tabs, or user-facing copy, except import’s existing error slot may show “That file is too large.” Login/signup strings stay generic.

## Abuse

Duplicate email stays generic. Throttle refusals stay generic. Failed-auth is counted, not logged as a password or an email.

Residual risk: 30-day JWT with no revocation (ADR-0003); no MFA; `trustHost: true` is required on Vercel and is only safe behind that edge; CSP does not constrain scripts; a flood of *new* emails from many IPs can still open tenants until a mailer exists; volumetric HTTP is Vercel’s problem.

## Phases

Feature specs: `features/phase-9-security/` (9.1–9.6). Board: `features/INDEX.md`.

| ID | Feature |
| --- | --- |
| 9.1 | Patch `drizzle-orm` past GHSA-gpj5-g38j-94v9; CI audit on production HIGH/CRITICAL |
| 9.2 | Isolation headers from `next.config.ts` |
| 9.3 | Dummy-hash verify on unknown login email |
| 9.4 | Auth attempt throttle (Neon + memory), login and signup |
| 9.5 | Bounded Rolodex import (bytes, rows, fields) |
| 9.6 | Text length helper + LIKE metacharacter escape |

Long pole: 9.1 → 9.2 → 9.3 → 9.4 → 9.5 → 9.6. Do not parallel. 9.3 and 9.4 both edit `authorize.ts`. Implement only after this docs PR merges; start at 9.1 from `main`.
