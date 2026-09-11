# Accounts Design (Phase 6)

**Date:** 2026-09-11
**Status:** approved
**Product:** Atrium / Accounts
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)

If this file and a later feature spec disagree, update this file first.

---

## Problem

Phase 0 locked Atrium to two env-seeded logins (`owner` and `demo`). That was enough to build the four apps. It is not enough to use Atrium as a personal product: a stranger cannot create an empty tenant, and a signed-in user cannot change their password.

## Users

- **Owner** — env-seeded. Persistent personal data. Never wiped by demo tooling. Unchanged.
- **Demo** — env-seeded. Seeded data. Reset demo. Unchanged.
- **Member** — created via `/signup` when `AUTH_SIGNUP_ENABLED=true`. One empty tenant, same shape as owner. No Reset demo. Not seeded.

## Job

Self-serve credentials accounts on the Auth.js stack that already exists. No new auth library.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Auth library | Keep Auth.js Credentials + JWT | Signup is one action; ripping 0.3 is not worth it |
| Email proof | None this phase | No mailer; instant access after signup |
| Openness | `AUTH_SIGNUP_ENABLED`; missing or not `true` is closed | Fail closed on a public Vercel deploy |
| After signup | Auto sign-in to `/` | Password was just typed |
| Password change | Logged-in `/settings` for every role | No mailer required |
| Forgot-password | Out | Needs email |
| Delete account | Out | Can wait |
| OAuth | Out | Account linking + provider apps + Playwright are their own feature; `accounts` table already exists |
| Extra members on a tenant | Out | Still one user per tenant |
| Password rule | At least 12 characters. No complexity theatre | Measurable; bcrypt stays |
| Duplicate email | Generic “Could not create account” | Same spirit as login: do not advertise which emails exist |
| Tenant name for a member | The new user’s email (unique, like `users.email`) | `tenants.name` is already unique; “Owner” / “Demo” stay reserved by seed |
| Settings chrome | Identity-chip email links to `/settings`; not a fifth app tab | Preserves Home/CRM/Space/Rolodex/Groove `exact: true` smokes |
| Rate limit | Out | Serverless in-memory limits are fake; the flag is the control |

## Non-goals (this phase)

- Public signup without the flag
- Email verification, magic links, OAuth, passkeys
- Forgot-password / reset-password email
- Account deletion, change-email
- Multi-member tenants, invites, billing
- Replacing Auth.js
- Rate limiting, CAPTCHA, audit log

OAuth stays deferred, not forbidden. Do not reshape `accounts` / `sessions` this phase.

## Auth and data

`users.role` is `'owner' | 'demo' | 'member'`. Seed still upserts only owner and demo. `npm run db:seed` must not delete member tenants or member users.

`requireTenant` accepts `member` the same way it accepts `owner` (session `userId` + `tenantId` + role). Client still never supplies `tenantId`. Reset demo remains `role === "demo"` only.

`signUp({ email, password })` is the deep interface: throws if the flag is off, if the email is empty/missing `@`, if the password is under 12 characters, or if the email is taken. Otherwise one transaction inserts tenant + user (`role: "member"`, bcrypt hash) and returns `{ id, email, tenantId, role: "member" }`.

`changePassword(userId, { current, next })` verifies the current hash, rejects a weak or unchanged next password, writes the new hash. Owner, demo, and member all use it.

Email is trimmed (same as login). Do not change case — owner/demo emails are stored as env typed them.

## Flows

**Signup, flag on.** `/login` links to `/signup`. Form: email, password, confirm password. Server action calls `signUp` then `signIn("credentials")` to `/`. Empty apps. No Reset demo. Duplicate email → generic error, no session. Confirm mismatch / weak password → specific error. Authenticated `/signup` → `/`.

**Signup, flag off.** No create-account link. `/signup` does not insert. Closed copy or redirect to `/login`. Existing members keep working.

**Change password.** `/settings`: current, new, confirm. Wrong current → generic “Could not update password”. Weak / mismatch / same-as-current → specific. Stay signed in on success.

**Login.** Unchanged generic “Invalid email or password”. Members use the same Credentials path.

## Chrome

`/signup` clones the Workroom login stage (brass A, card, `atrium-field` / `atrium-btn-primary`). Login footer no longer says “Two accounts · no signup”. `/settings` is an authenticated page using the same field/button classes. No new CSS namespace.

## Abuse

Fail closed on the flag. Do not log passwords. Residual risk: when the flag is on, bots can open empty tenants. Accept until a later mailer or rate-limit feature. `.env.example` documents the flag off until you want it on.

## Phases

Feature specs: `features/phase-6-accounts/` (6.1–6.4). Board: `features/INDEX.md`.

| ID | Feature |
| --- | --- |
| 6.1 | Role `member` + `signUp` helper (TDD, flag, transaction). No UI. |
| 6.2 | `/signup` + login link + auto sign-in + closed state. |
| 6.3 | `changePassword` + `/settings` (all roles). |
| 6.4 | Playwright smoke. |

Long pole: 6.1 → 6.2 → 6.3 → 6.4. Do not parallel. Implement only after this docs PR merges; start at 6.1 from `main`.
