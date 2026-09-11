# Integrity Design (Phase 8)

**Date:** 2026-09-11
**Status:** approved
**Product:** Atrium / Integrity
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)

If this file and a later feature spec disagree, update this file first.

---

## Problem

Phases 0–7 shipped four apps, self-serve accounts, and a modular monolith whose expensive decisions are written down and gated. The next change is not a fifth app and not another architecture pass.

Three claimed interfaces are still shallow: the caller has to know a race, a Unicode trick, or which copy of a list is real.

- Signup treats `Tyler@x` and `tyler@x` as one mailbox (`lower(email)` on lookup). The database does not. `users.email` is `.unique()` on the raw column, so two concurrent case-variant signups both pass the pre-check and both insert. Phase 6.1 named this and left it: a schema change that spec did not authorize.
- The password minimum is “12 characters.” Both `signUp` and `changePassword` measure `string.length`, which is UTF-16 code units. `"😀".repeat(6)` is 6 visible characters and 12 code units, so it passes. Phase 6.3 named this. The 72-byte bcrypt ceiling is already honest (`Buffer.byteLength`); the floor is not. Change-password re-implements the same two checks instead of sharing the policy, so a third password surface would copy them again.
- Rolodex import has two `PERSON_FIELDS` arrays. `lib/rolodex/import.ts` is the parser (Papa / `vcf`, not client-safe). `components/rolodex/import-dialog.tsx` duplicated the list so 7.5’s client-boundary gate would stay green. The copies have already drifted: the server marks `name` `required: true`, the dialog does not. Adding a field means touching both, and missing one is silent.

This phase makes those three interfaces deep. It does not add a product, a service, or a new auth library.

## Users

Unchanged. Owner, demo, and member. No new role.

## Job

Callers of signup, login, change-password, and Rolodex import should not have to know about a racy pre-check, UTF-16 vs bytes, or a second field catalog. The database, one policy module, and one catalog own those secrets.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Phase job | Close named integrity holes, not a new app | Phase 7 already hardened the monolith; another architecture dump is the Sistine Chapel |
| Email uniqueness | Unique index on `lower(email)`; drop the byte-exact column unique | The lookup is already case-insensitive; the index must match or the pre-check is theatre under concurrency |
| Stored email | Still stored as typed | Owner/demo stay env-verbatim; login already compares `lower` on both sides |
| Password floor | 12 Unicode *code points* (`Array.from(value).length`) | Matches “12 characters” for BMP and for a single emoji; 6.3’s named follow-up |
| Password ceiling | 72 UTF-8 bytes, unchanged | bcrypt truncates there; two long passphrases must not verify against each other |
| Grapheme clusters | Out | `Intl.Segmenter` would count a family emoji as one; no user asked; code points close the named hole |
| Policy module | `lib/auth/password-policy.ts` returns `{ ok, value }` / `{ ok: false, code }` | Signup throws `SignUpError`, settings throws `ChangePasswordError`. Sharing the error class couples the two. Sharing the *decision* does not |
| Field catalog | `lib/rolodex/person-fields.ts`, imported by parser and dialog | One list; 7.5 stays green because the module does not import queries / Papa / `vcf` |
| Action layer | Leave `*ForSession` + `*Action` | Injectable session vs dynamic `auth` is the test seam, not duplication to DRY |
| Query barrels | Leave the 7.4 split | Space’s 615-line barrel is dispatch + row construction, not mud |
| Tenant-predicate gate | Out | No known missed `AND tenantId`; a regex over SQL would be a shallow wrapper. 7.3’s index test plus review remain the backstop |
| `middleware.ts` → `proxy` | Out | Next 16 deprecation warning; not a user-visible failure. Rename when a feature has to touch the file |
| RLS / revocation / OAuth / mailer | Out | Locked in 6.x / 7.x; no reversal trigger has fired |

## Non-goals (this phase)

- Postgres RLS, `SET LOCAL`, a pooled/WebSocket Neon driver
- Session revocation, `passwordChangedAt`, “sign out everywhere”
- OAuth, mailer, forgot-password, delete account, change-email
- Multi-member tenants, billing, rate limits, CAPTCHA
- Unifying `*ForSession` / `*Action`, extracting Groove, unifying drag libraries, TanStack Query
- Renaming `middleware.ts` to `proxy`
- A source-grep that every Drizzle `where` mentions `tenantId`
- Rewriting Rolodex Today as one SQL (the five `list*` calls are already behind `getDashboard`; the e2e slowness is Neon RTT at demo size, not a forcing function)
- New routes, new env vars, new tables besides the email index replacement

## Architecture (current)

Unchanged from [Phase 7](./2026-09-11-architecture-design.md). One Next.js deployable, one Neon database, Groove client-only, application tenancy, neon-http `db.batch`.

This phase does not change the quantum, the driver, or the auth library. It changes one unique index, one policy module, and one catalog.

## Auth and data

`users.email` stays `text.notNull()`. It loses `.unique()`. A unique index `users_email_lower_idx` on `lower(email)` is the uniqueness rule. Login and signup keep comparing `lower(email)` in application code — the index is the backstop for the race, not a replacement for the pre-check (the pre-check still turns a unique violation into generic `unavailable` without advertising which emails exist).

`tenants.name` stays byte-exact unique. Member tenants are named with the typed email; a rolled-back batch does not leave an orphan tenant, so a case-variant pair cannot occupy two tenant names without two users.

Password policy lives in `lib/auth/password-policy.ts`. `assertPasswordStrength` in signup and the length branch in `changePassword` both call it. Constants `MIN_PASSWORD_LENGTH` and `MAX_PASSWORD_BYTES` move there; signup may re-export them so existing test imports do not fork.

Rolodex `PERSON_FIELDS` lives in `lib/rolodex/person-fields.ts`. `import.ts` and `import-dialog.tsx` import that module. Header synonyms stay in the parser — they are parse rules, not chrome.

## Flows

**Signup, concurrent case variants (after 8.1).** Two POSTs of `Tyler@x` / `tyler@x` at the same moment: at most one member exists. The loser maps to generic `Could not create account.` Login with either casing still finds the winner.

**Password (after 8.2).** `"😀".repeat(6)` is weak on signup and on `/settings`. `"abcdefghijkl"` still passes. A 73-byte passphrase still fails as too long. Copy does not mention code points.

**Import (after 8.3).** The mapping `<select>` and the parser iterate the same `PERSON_FIELDS`. Adding a field is one array. The client-boundary gate still passes.

## Chrome

None. No new routes, tabs, or copy, except existing weak-password / too-long strings which stay as they are.

## Abuse

Duplicate email stays generic. The unique index does not change that: a 23505 still becomes `unavailable`, never “email already exists.”

A 12-code-point password of six emoji is rejected. That is the point of 8.2, not a new attack surface.

The field catalog being client-safe does not expose Papa or `vcf` to the browser.

## Phases

Feature specs: `features/phase-8-integrity/` (8.1–8.3). Board: `features/INDEX.md`.

| ID | Feature |
| --- | --- |
| 8.1 | Case-insensitive unique email index. Drop `users.email` column unique. |
| 8.2 | Shared password policy: 12 code points min, 72 UTF-8 bytes max. |
| 8.3 | Client-safe `PERSON_FIELDS` catalog; dialog stops duplicating it. |

Long pole: 8.1 → 8.2 → 8.3. Do not parallel. Implement only after this docs PR merges; start at 8.1 from `main`.

8.2 and 8.3 do not depend on 8.1’s migration. They still run in order so one feature is `in_progress` at a time.
