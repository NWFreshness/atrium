# Rolodex Design (Phase 3)

**Date:** 2026-09-09
**Status:** approved
**Product:** Atrium / Rolodex
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)
**Behavior source:** the reference implementation's `docs/rolodex/` and `server/src/rolodex/`

If this file and a later feature spec disagree, update this file first.

---

## Problem

Relationships fade by accident. Rolodex is the personal CRM in Atrium: who the people in your life are, when you last spoke, and when you are overdue a catch-up.

The reference implementation did this with Vite + Express + SQLite and no login. Atrium hosts the same jobs behind Auth.js, Neon Postgres, and `tenantId` from the session.

## Users

Same as the parent design: owner (empty, never wiped) and demo (seeded, Reset demo). No public signup.

## Job

Five sections at `/rolodex`: Today, People, Circles, Calendar, Timeline.

Clone the reference implementation's jobs-to-be-done, not pixel-identical CSS and not Express/SQLite/Vite.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Feature slice | 3.1–3.10 CRM-shaped | Same size as CRM/Space; import and Today are their own PRs |
| Photos | Initials only in v1; no `photo` column | Vercel has no durable FS; no blob vendor in the locked stack |
| Calendar dates | ISO `YYYY-MM-DD` text | reference cadence math is timezone-stable on date strings |
| Last contacted / status | Derived on read, never stored | Reference: logging an interaction is the only clock reset |
| Circles | Fixed Inner/Close/Wider/Distant | 30 / 91 / 182 / 365 days |
| People grid | TanStack Table (already in repo) | Same as CRM orgs/contacts |
| Circles board | `@hello-pangea/dnd` (already in repo) | Same as CRM pipeline columns |
| Today charts | `recharts`, `isAnimationActive={false}` | Same as CRM dashboard |
| Import | Papa Parse + `vcf` in 3.4, not 3.1 | Parsing is its own test surface |

## Data model

Copy `lib/crm/`: `constants`, `schema`, `queries` (memory repo + Drizzle), `seed`, `reset`. Query helpers take `tenantId` first, then optional `repo`, then trailing `opts`. Missing/blank `tenantId` throws. No `DATABASE_URL` → throw `"Rolodex store required"`.

Eight tables, UUID text ids, `tenantId` → `tenants.id` restrict. Child rows cascade when the person is deleted.

```ts
// people: id, tenantId, name, email, phone, jobTitle, company, city, timezone,
//   circle, cadenceOverrideDays, checkinsOff, snoozedUntil, howMet, metWhere, metOn,
//   notes, tags (jsonb string[]), createdAt, updatedAt
//   no photo column
// interactions: id, tenantId, personId cascade, type, date, notes, createdAt
// importantDates: id, tenantId, personId cascade, type, label, month, day, year?, createdAt
// facts: id, tenantId, personId cascade, text, createdAt
// news: id, tenantId, personId cascade, text, date, createdAt
// reminders: id, tenantId, personId cascade, text, dueDate, done, doneAt, createdAt
// gifts: id, tenantId, personId cascade, name, kind, occasion, date, createdAt
// connections: id, tenantId, personA cascade, personB cascade, kind, aIsParent,
//   label, inverseLabel, note, createdAt
```

Enums (reference):

- circle: `inner` | `close` | `wider` | `distant`
- interaction type: `call` | `message` | `email` | `met` | `other`
- important date type: `birthday` | `anniversary` | `work_anniversary` | `child_birthday` | `other`
- gift kind: `idea` | `given` | `received`
- check-in status (computed): `in_touch` | `due_soon` | `overdue` | `snoozed` | `off`
- connection kind: `partner` | `parent_child` | `sibling` | `colleague` | `other`

Do not re-export names containing `rolodex` from `lib/db/schema.ts`. Re-export tables as `people`, `interactions`, … like CRM uses `organizations`.

## Derived fields (never stored)

- **Last contacted** = `MAX(interactions.date)` for that person. Never typed.
- **Latest news** = newest news row by date.
- **Cadence days** = override if set and > 0, else circle default; `null` if `checkinsOff`.
- **Status** via `computeStatus` (port the reference implementation's `cadence.ts`):
  - `off` if check-ins disabled
  - `snoozed` if `snoozedUntil` is today or later
  - else `nextDue` = last contacted + cadence days, or **today** if never contacted
  - never contacted: `due_soon` on the day, `overdue` from tomorrow
  - `due_soon` if due within 7 days; else `overdue` or `in_touch`
- **29 February** celebrated on the 28th in common years (`effectiveDay`).
- **Milestone** birthday: year known and the age being reached this year ends in 0.

## Seed and reset

Demo tenant only. Owner empty.

At least 30 people, no circle empty, initials everywhere, at least one birthday in each of the next three months, interactions going back at least a year, at least one of every other entity type. Deterministic names (port the reference implementation's seed intent, not SQLite ids).

Idempotent: skip insert when that tenant already has people. Reset still deletes then seeds.

`registerDemoResetter` at module load; import from `app/(authenticated)/layout.tsx` next to CRM/Space.

After a seed-extending merge, tell the user to Reset demo — `npm run db:seed` will not backfill an already-seeded tenant.

## Routes and shell

- `/rolodex` Today (landing)
- `/rolodex/people` table
- `/rolodex/people/[id]` person page (404 missing/other-tenant)
- `/rolodex/circles` board
- `/rolodex/calendar` month grid
- `/rolodex/timeline` global log

Five-item Rolodex subnav. Atrium strip stays. CSS `rolodex-` prefixed, imported only from Rolodex files.

Palette: `#ecad0a` amber, `#209dd7` blue, `#753991` purple, plus grays. Avoid background gradients, purple backgrounds, gradient buttons, single-side accent borders.

People appear with initials on a flat color derived from their name (table, board, person page, feeds).

## Features

| ID | Feature | Depends on |
| --- | --- | --- |
| 3.1 | Schema, seed, demo resetter | 0.5 |
| 3.2 | Shell and five-section subnav | 3.1 |
| 3.3 | People table and person page | 3.1, 3.2 |
| 3.4 | CSV and vCard import | 3.3 |
| 3.5 | Circles board, cadence, snooze | 3.3 |
| 3.6 | Interactions, facts, news, reminders, Timeline | 3.3 |
| 3.7 | Important dates and calendar | 3.3 |
| 3.8 | Gifts and connections | 3.3, 3.7 |
| 3.9 | Today dashboard | 3.5, 3.6, 3.7 |
| 3.10 | Playwright smoke | 3.9 |

Long pole: 3.1 → 3.2 → 3.3 → 3.5 → 3.9 → 3.10. 3.4, 3.6, 3.7 can start after 3.3 but must not run in parallel with each other if they share the person page. Do not parallel any two Rolodex features.

## Import (3.4)

CSV (Papa Parse) or vCard (`vcf`). Map columns from header synonyms. Preview. Duplicates flagged by email first, then exact name; flagged rows cannot be ticked. Apply is all-or-nothing. Ragged CSV cells may be missing. vCard `propValue` must handle both library return shapes (reference).

Birthday on import creates an `importantDates` row when mapped.

## Out of v1

Photo upload / object storage, custom fields, export, push/email notifications, AI, user-configurable circles, table pagination, journal/diary, extra analytics beyond Today.

## Testing

TDD on domain: cadence, dates, tenant CRUD, import parse, seed/reset. `env -u DATABASE_URL npm test`. Controller re-runs `npm test` and `AUTH_SECRET=ci-build-placeholder npm run build`.

Playwright in 3.10. Login is owner/demo email+password.

## Board

`features/INDEX.md`. Specs: `features/phase-3-rolodex/`. Next implementable unit after this file: 3.1. Do not invent Groove specs.
