# CRM Integrity Design (Phase 11)

**Date:** 2026-09-29
**Status:** proposed — specs written, not implemented
**Product:** Atrium / CRM
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)

If this file and a later feature spec disagree, update this file first.

---

## Problem

Phases 0–10 shipped four apps, accounts, a modular monolith, integrity and security gates, and a PNW theme. The CRM still has dead-ends the user cannot fix, and a list/task surface that exists only as two dashboard panels.

The ideas document (`docs/crm-feature-ideas.md`) named sixteen gaps in the shipped CRM. The ones that still hold, verified against the tree:

- A deal accepts a negative value or a probability of 101, and every total inherits the lie.
- `deleteActivity` is written, tested, and unreachable. A mistyped note is permanent. Activities cannot be backdated. Last-contacted is derived in Rolodex and unused in CRM.
- No CRM table sorts. No detail page edits. Contact emails are not unique. Deletes silently `SET NULL` with a one-name confirm.
- Deals filter only by text `q`. Follow-ups have no section. There is no cross-entity jump.

The pipeline drag and the activity timeline have no browser coverage (`e2e/crm.spec.ts` is four tests). Later features in this phase change those surfaces; writing the net first is what makes the rest survivable.

This phase closes those dead-ends and adds the missing list/task surface. It does not add a fifth app, a new data model beyond one expression index, RLS, or a CRM↔Rolodex link.

## Users

Unchanged. Owner, demo, and member. No new role.

## Job

When I am in the CRM I want to correct a bad activity, trust the numbers on a deal, find a follow-up, and jump to a record from the keyboard — without leaving a twin contact, an unsortable table, or a delete I cannot preview.

## Decisions

| # | Decision | Choice | Why |
| --- | --- | --- | --- |
| 1 | Feature cut | **Ten features. No 11.11. No 11.8-shaped gap.** 11.3 absorbs A2 + B4 (activity delete + edit + backdate + last-contacted). 11.8 is Deal filters; 11.9 is Tasks; 11.10 is QuickFind | Matches what 11.1 already stated, minus the obsolete "there is no 11.8 spec" wording. Two parallel lanes produced twelve files and two numberings; this is the reconciliation |
| 2 | Long pole | **`11.1 → 11.4 → 11.5`, then `11.3 → 11.9`.** The rest are order-free | 11.4 and 11.5 share the table files; 11.9 mounts the same activity timeline 11.3 completes. One `in_progress` at a time |
| 3 | 11.1 | **Test-only.** Five new Playwright tests across two files, one CI readiness-gate line (already in flight as PR #90), a comment on `fullyParallel: false`. Nothing under `app/`, `components/`, or `lib/` | The pipeline and activity surfaces have no browser net. Behaviour changes without that net are unprovable |
| 4 | Schema | **No new table.** 11.6 adds one **tenant-composite** unique index: `uniqueIndex("contacts_email_lower_idx").on(table.tenantId, sql\`lower(${table.email})\`)`. Last-contacted is derived, never a column on `contacts` | `users.email` is a login (8.1 global is correct). `contacts.email` is tenant data — a global unique refuses tenant B's Ana because tenant A already has her (proven 23505 on PG 16.15). Nullable emails stay insertable |
| 5 | Routes | **Exactly one new route: `/crm/tasks` (11.9).** QuickFind is layout-mounted and adds none | Sixth tab is the missing follow-up section. A seventh tab is out |
| 6 | QuickFind vs Tasks | **11.10 depends on 11.9** | The acceptance criterion "⌘K opens from any CRM section" freezes a five-section list unless `/crm/tasks` exists |
| 7 | Tier C | **Out of Phase 11.** C1 stage history → Phase 12, with C4 won/lost reasons as a cheap rider. C2 tags + C3 import/export → Phase 13 (import after unique email). **C5 CRM↔Rolodex needs an ADR before it is specced** | C1 is a new table and every pipeline metric. C5 crosses the modular-monolith quantum (ADR-0001) |
| 8 | Status word | **`specced`**, not `pending` | That is what the spec files' own `**Status:**` line says |
| 9 | `.seed-snapshots/` | **Gitignored. Not committed.** Local `psql` dumps of a Neon branch are not source of truth | The repo had no ignore rule; a stranded tracking commit tried to add the dumps. Schema lives in `drizzle/` |
| 10 | Tenant rule | Unchanged: every query takes `tenantId` from the session. Never from the body or query string | `AGENTS.md`. QuickFind, filters, and delete-preview are not exceptions |

## Non-goals

Locked, unchanged:

- No RLS, no `SET LOCAL`, no pooled/WebSocket Neon driver
- No session revocation, no `passwordChangedAt`, no "sign out everywhere"
- No OAuth, no mailer, no MFA, no CAPTCHA
- No component library, no Tailwind, no shadcn, no TanStack Query/Router, no third theme
- No `script-src` CSP / nonce middleware, no `middleware.ts` → `proxy` rename
- Groove never hits the database

From the ideas document, with the reasons it already recorded:

- **Multi-currency.** `formatMoney` is one `Intl.NumberFormat`. A currency column needs a rate or an FX date to make historical totals honest. Wrong for a personal CRM.
- **Email or calendar integration.** Deferred in 1.7; it needs a mailer, which is a locked non-goal.
- **User-defined custom fields.** An EAV schema, a form builder, and a migration story. Tags (C2) is the 80/15 substitute, and it is Phase 13.
- **Configurable pipeline stages.** Breaks `STAGE_PROBABILITY`, funnel order, the six-column board, and the stage CSS classes. A v2 product change.
- **AI scoring.** Theatre over six deals; needs an API key and a data-egress decision.
- **Soft deletes / recycle bin.** Doubles every list filter and every seed wipe. 11.7's consequence preview is the safety without that cost.

Also out of this phase (named, deferred, not silently dropped):

- C1 stage history / velocity, C2 tags, C3 import/export, C4 won/lost reasons, C5 CRM↔Rolodex
- Bounded list pagination (G15 / B5)
- Pipeline board filtering or column collapse (G5)
- A last-contacted *filter* on contacts

## Data and auth

No new auth surface. No new env var. Session shape unchanged (`id`, `email`, `tenantId`, `role`).

11.6 is the only schema change: `uniqueIndex("contacts_email_lower_idx").on(sql\`lower(${table.email})\`)`. Contacts with a null email are unaffected. Duplicate create/update maps `23505` to a typed error; copy does not advertise which emails exist.

No other table, column, or FK changes. `onDelete: "set null"` stays. 11.7 previews consequences; it does not cascade.

Demo reset is unchanged: it already wipes CRM rows by `tenantId`. `/crm/tasks` reads existing `activities` with a `dueDate`.

## Flows

**Pipeline drag (after 11.1).** A mouse or keyboard move of a minted deal `New → Qualified` rebases probability to 25% and **survives a reload**. The Deals table agrees.

**Bad deal numbers (after 11.2).** Saving value `-1` or probability `101` is refused on the server. `STAGE_PROBABILITY` values still pass. `moveDeal` is not a second assert site.

**Correct an activity (after 11.3).** Edit opens the existing form with a Date field; delete is behind `confirm()`. Backdating re-sorts the timeline after reload. The done checkbox's accessible name is the truncated form; 11.1 Journey E's locator in `e2e/crm-activities.spec.ts` updates in the same commit. Contact detail shows derived Last contacted.

**Edit from detail (after 11.5).** Each `[id]` page has Edit that mounts the same dialog as the list row. Save persists; Cancel discards. No Add on a detail page.

**Duplicate email (after 11.6).** A case-variant of an existing contact email is refused with "A contact with that email already exists" and a link to the existing record.

**Delete org with children (after 11.7).** Confirm names the counts that will unlink. `SET NULL` behaviour is unchanged.

**Filter deals (after 11.8).** Stage, close-date window, and organization compose with `q`. Client-side 11.4 sort still applies to the filtered rows.

**Tasks (after 11.9).** `/crm/tasks` is a sixth CRM tab. Overdue and upcoming follow-ups, including activities with a `dueDate` and no contact or deal.

**QuickFind (after 11.10).** `⌘K` / `Ctrl+K` from any CRM section, including `/crm/tasks`, jumps to an organization, contact, deal, or activity in this tenant.

## Chrome

1. **11.1** adds no chrome.
2. **11.3** adds Edit / Delete on timeline rows and a Date field on `ActivityForm`. Dashboard feed stays read-only.
3. **11.4 / 11.5** make headers sortable and put Edit on detail pages, reusing existing dialog chrome.
4. **11.6 / 11.7** use the existing contact dialog error slot and the existing `confirm()` path.
5. **11.8** adds filter controls on `/crm/deals` only — not the pipeline board.
6. **11.9** adds the sixth subnav tab and `/crm/tasks`.
7. **11.10** mounts a palette in the CRM layout, copying Space 2.7's interaction, not its module.

CSS stays `crm-` prefixed. Shared nav stays `atrium-nav-`. No Tailwind.

## Abuse

Duplicate-email copy names the collision inside the tenant; it does not leak other tenants. QuickFind, deal filters, delete-preview counts, and activity edit/delete are session-scoped. Throttle, dummy-hash login, and isolation headers are unchanged.

Residual risk unchanged from Phase 9: 30-day JWT with no revocation; no MFA; no `script-src` CSP.

## Phase table

Feature specs: `features/phase-11-crm-integrity/` (11.1–11.10). Board: `features/INDEX.md`.

| ID | Feature | Depends on | Effort |
| --- | --- | --- | --- |
| 11.1 | CRM e2e coverage (pipeline + activities) | nothing | 4–6 h |
| 11.2 | Deal number validation | 11.1 | 2–3 h + deals e2e |
| 11.3 | Activity correct-and-complete (A2+B4 merged) | 11.1 | 5–7 h |
| 11.4 | Table column sorting | 11.1 | 2–3 h |
| 11.5 | Edit from detail pages | 11.4 | 3–4 h |
| 11.6 | Contact email uniqueness + duplicate pre-check | nothing | 4–6 h |
| 11.7 | Delete-consequence preview | nothing | 2–3 h |
| 11.8 | Deal filters | nothing | 4–5 h |
| 11.9 | Follow-ups / Tasks section | 11.3 | 6–8 h |
| 11.10 | CRM QuickFind (⌘/Ctrl+K) | 11.9 | 5–7 h |

**Long pole:** 11.1 → 11.4 → 11.5, then 11.3 → 11.9. 11.2, 11.6, 11.7, and 11.8 may run in any order after their dependencies, but not in parallel with a feature that shares files (11.4/11.5 share the tables; 11.7/11.8 both touch `deal-table.tsx` / `deal-actions.ts` — serialize those two). Do not parallel two features that touch the same files.

Implement only after this docs PR merges; start at 11.1 from `main`.
