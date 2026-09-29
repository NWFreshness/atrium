# CRM feature ideas

**Date:** 2026-09-29
**Status:** Phase 11 realizes Tier A plus the named Tier B features (B1 QuickFind, B2 deal filters, B3 Tasks; B4 absorbed into 11.3). This file stays an ideas document; numbering in the sequencing table below is historical.
**Scope:** the CRM app only (`/crm`). No other app, no auth/tenancy work, no infrastructure.

---

## What this document is

Sixteen candidate features for the CRM, each grounded in a specific gap in the shipped code,
ordered by value-per-hour. It is an **ideas document, not a spec set**. Nothing here touches
`features/INDEX.md`, `CURRENT_FEATURE.md`, or `HANDOFF.md`, and no feature is marked
`in_progress`.

If you pick one from this list, the correct next step is the docs PR described in
`references/phase-spec-authoring.md`: a Phase 11 design doc, a `features/phase-11-*/N.M-*.md`
set, and the three tracking files moved together. That is a separate, deliberate act — this file
does not start it.

The repo's own rules shape everything below. `AGENTS.md` forbids Tailwind/shadcn/TanStack
Query/TanStack Router; TanStack **Table** is already allowed in CRM table features. All SQL goes
through Drizzle. No query runs without a session `tenantId`. `crm-` CSS prefix. TDD on domain
logic, one feature at a time, feature branch + PR.

---

## Current state (what the CRM already does)

Read `lib/crm/` and `app/(authenticated)/crm/` in full before acting on anything here.

| Surface          | What exists                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema           | 4 tables: `organizations`, `contacts`, `deals`, `activities` (`lib/crm/schema.ts`). Every row carries `tenantId`; every table has a `tenantId` index from 7.3. FKs are `SET NULL`, never cascade.           |
| Domain constants | 6 deal stages, 3 contact statuses, 3 activity types, `STAGE_PROBABILITY` map, `expectedValue` (`lib/crm/constants.ts`).                                                                                     |
| Sections         | Dashboard (`/crm`), Organizations, Contacts, Deals, Pipeline — a 5-tab subnav (`components/crm/crm-subnav.tsx`).                                                                                            |
| Tables           | TanStack `tableFeatures` + `useTable` + `FlexRender` for all three lists, with `role="dialog"` add/edit, `confirm()` delete, `aria-label="Edit {name}"` row actions.                                        |
| Search           | `?q=` on orgs, `?q=` + `?status=` on contacts, `?q=` on deals. ILIKE with `escapeIlike` + `ESCAPE '\'` (9.6).                                                                                               |
| Pipeline         | `@hello-pangea/dnd`, 6 columns, `boardOrder`, optimistic rebase, `moveDeal` renumbers the target column, stage change rebases probability.                                                                  |
| Activities       | note/call/email with optional `dueDate` and `done`; timeline on contact + deal detail, newest first.                                                                                                        |
| Dashboard        | 5 tiles, monthly revenue + deal volume, cumulative funnel, win/loss donut, top organizations, recent activity, overdue + upcoming follow-ups. All aggregation in `lib/crm/dashboard.ts`, all tenant-scoped. |
| e2e              | 4 tests (`e2e/crm.spec.ts`): unauth redirect, demo walk of the dashboard + all 4 subnav tabs + seed orgs, create-an-org, owner-isolation.                                                                   |

---

## Gaps found in the shipped code

Every feature below traces to one of these. All were verified by reading the code in this
session; the line references are the evidence.

| #   | Gap                                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | **No activity delete or edit, anywhere.** `deleteActivity` exists in the query barrel but there is no `deleteActivityAction` and no UI control. A mistyped note is permanent.                                                                                                                           | `lib/crm/queries.ts:408` (the only definition); zero matches for `deleteActivityAction` in `lib/crm/` or `components/crm/`; `components/crm/activity-timeline.tsx` renders only a done-checkbox. |
| G2  | **No detail page can be edited.** All three `[id]` pages render a read-only `<dl>`. The only edit UI is a dialog on the list page, so editing a deal means navigating back to `/crm/deals`, finding the row, and clicking Edit.                                                                         | `app/(authenticated)/crm/{organizations,contacts,deals}/[id]/page.tsx` — no form, no Edit control.                                                                                               |
| G3  | **No column sorting on any CRM table.** TanStack is wired up, but no `getSortedRowModel`/`SortingState` anywhere. The reference `DataTable` sorts.                                                                                                                                                      | zero matches for `getSortedRowModel                                                                                                                                                              | SortingState | onSortingChange`in`components/crm/`. |
| G4  | **Deals have no filters at all** — only a text `q`. No stage filter, no close-date window, no organization filter, even though `ListDealsOpts` already has `organizationId` and `contactId`.                                                                                                            | `app/(authenticated)/crm/deals/page.tsx:11-17`; `lib/crm/queries-shared.ts:73-77`.                                                                                                               |
| G5  | **Pipeline board cannot be filtered or collapsed.** It always renders all six columns with every deal, Won and Lost included.                                                                                                                                                                           | `app/(authenticated)/crm/pipeline/page.tsx:5` calls `listDealsAction()` with no opts.                                                                                                            |
| G6  | **Follow-ups only exist on the dashboard.** `dueDate` + `done` makes an activity a task (1.7's own words), but the only surface listing them is two dashboard panels. There is no `/crm/tasks`, no way to see "everything due in the next 7 days", no way to find a task not tied to a contact or deal. | `app/(authenticated)/crm/page.tsx:98-101` is the sole consumer of `data.followUps`.                                                                                                              |
| G7  | **Activities cannot be backdated.** The form has type / description / dueDate / done and no `occurredAt`, while the query layer accepts one and the timeline renders it. Logging a call from Tuesday on Wednesday is impossible.                                                                        | `components/crm/activity-form.tsx:57-105`; `lib/crm/activity-actions.ts:103-105` defaults `occurredAt` to `new Date()`.                                                                          |
| G8  | **No "last contacted" on a contact.** Rolodex derives it; CRM does not, despite `compareActivitiesNewestFirst` already existing as the exact helper needed.                                                                                                                                             | `lib/crm/queries-shared.ts:168`; zero uses in `components/crm/`.                                                                                                                                 |
| G9  | **Contact emails have no uniqueness.** `contacts.email` is nullable with no unique index — not even a `lower()` expression index like 8.1 built for `users`. The same person can be added twice, and contact search returns both.                                                                       | `lib/crm/schema.ts:47`; the only index is `contacts_tenantId_idx` (line 59).                                                                                                                     |
| G10 | **Deal numbers are unvalidated.** `createDeal` asserts nothing on `value`/`probability` beyond being a number; `updateDeal` asserts only `name`. A negative value or a 400% probability is accepted and poisons every total, the funnel, and the expected-revenue tile.                                 | `lib/crm/queries.ts:291-331`; `deal-form.tsx:88-92` checks `isFinite` client-side only.                                                                                                          |
| G11 | **Deletes silently orphan rows.** `onDelete: "set null"` means deleting an organization nulls its contacts' and deals' `organizationId`, and they render as a blank `<dd>`. The confirm dialog says only "Delete {name}?" with no consequence preview.                                                  | `lib/crm/schema.ts:51,65,76`; `components/crm/org-table.tsx:62-66`.                                                                                                                              |
| G12 | **No deal stage history.** Every pipeline metric is derived from a deal's _current_ stage. Days-in-stage, stage conversion, and forecast-vs-actual are not computable — the reference implementation documents this exact limitation and works around it by making the funnel cumulative.               | `lib/crm/dashboard.ts:131-153`; `lib/crm/constants.ts:14-20`.                                                                                                                                    |
| G13 | **No tags or custom fields** on CRM records. Explicitly excluded in 1.3. Rolodex already has `tags jsonb` as a precedent.                                                                                                                                                                               | `features/phase-1-crm/1.3-organizations.md` Exclude; `lib/rolodex/schema.ts:59`.                                                                                                                 |
| G14 | **No import or export.** Explicitly excluded in 1.3 and 1.4. Rolodex has the full machinery already (Papa Parse, `import-limits.ts`, `person-fields.ts`).                                                                                                                                               | `features/phase-1-crm/1.3-organizations.md` and `1.4-contacts.md` Exclude sections.                                                                                                              |
| G15 | **Every list query is unbounded.** No `.limit()` anywhere in the CRM Drizzle module; a tenant with 10k deals transfers all 10k to render a table.                                                                                                                                                       | `lib/crm/queries-drizzle.ts:95-380` — no `limit` call in any list function.                                                                                                                      |
| G16 | **No cross-entity search.** Each page has its own `q` box; Space already has a ⌘/Ctrl+K QuickFind across pages, databases, and rows.                                                                                                                                                                    | `app/(authenticated)/crm/*/page.tsx`; `components/space/quick-find.tsx` is the in-repo precedent.                                                                                                |

**One more observation, not a gap but a risk to plan around:** `e2e/crm.spec.ts` covers the
dashboard, the subnav, organization creation, and tenant isolation — and nothing else. The
pipeline drag, the deal flow, and activities have **no e2e coverage**, though the reference has
keyboard-drag tests for exactly those. Any feature touching the pipeline or activities should
carry its own e2e, and a foundational e2e feature (P0 below) is worth doing before the
behaviour starts changing.

---

## Tier A — integrity and dead-ends (no new tables, or one cheap one)

Highest value per hour. Each closes a gap where the app can hold a state the user cannot fix,
or where a shipped UI claim is shallow.

### A1. Contact email uniqueness + duplicate pre-check

**JTBD:** "When I add someone I already have in the list, tell me instead of creating a twin."

Closes **G9**. Mirrors the integrity work already shipped for users (8.1's `lower()` unique
index) and for Rolodex import (3.4's email-then-name dedupe). CRM contacts are the one place
where a duplicate is both easy to create and silently corrupting — deal search and the
top-organizations chart both double-count.

- **Schema:** drop any byte-exact unique if added; add
  `uniqueIndex("contacts_email_lower_idx").on(sql\`lower(${table.email})\`)` — nullable columns
  are exempt from unique indexes in Postgres, so contacts with no email are unaffected.
- **Migration:** hand-edited `IF NOT EXISTS`, with the name-not-definition caveat written into
  the file, exactly as 0004/0005/0006 do.
- **Query layer:** `assertText` already runs on `createContact`/`updateContact`. Add a duplicate
  pre-check before insert and map the `23505` violation to a typed error code in the action —
  the same two-layer shape 8.1 used for `upsertUserByEmail`, which also had to be fixed for the
  same reason (Postgres cannot infer an expression index from a column-name conflict target).
- **UI:** the add/edit contact dialog checks email and surfaces "A contact with that email
  already exists" with a link to the existing record.
- **Acceptance:** creating a case-variant duplicate returns the typed code, not a 500; the
  memory repo matches the Drizzle repo's case-insensitive behavior; contacts with null email
  are unaffected; the existing contact form and `e2e` create-org flow are unchanged.
- **Effort:** 4–6h. **Risk:** low. **Depends on:** nothing.

### A2. Activity delete and edit

**JTBD:** "I logged the wrong thing — let me fix or remove it."

Closes **G1**. This is the sharpest dead-end in the CRM: `deleteActivity` is written, tested, and
unreachable. A note with a typo, a call logged against the wrong contact, a duplicated entry —
none are correctable. 1.7's own spec deferred "editing description" as _optional_, and that
deferral is what produced the dead-end.

- **Query layer:** unchanged. Both functions already exist and are tested.
- **Actions:** add `deleteActivityForSession` / `deleteActivityAction` and
  `updateActivityForSession` / `updateActivityAction`, following `deal-actions.ts`'s exact
  shape (`*ForSession(getSession, …)` with an injectable repo, then a thin dynamic-importing
  `*Action`).
- **UI:** on `ActivityTimeline`, an Edit button that opens a dialog with the existing
  `ActivityForm` prefilled (type / description / dueDate / done) and a Delete button behind the
  same `confirm()` the tables use. Row action labels stay `Edit {description}` /
  `Delete {description}` to match the table convention.
- **Acceptance:** an activity can be deleted and stays deleted across refresh; an edit persists
  and re-sorts the timeline correctly when `occurredAt` changes; both actions are tenant-scoped
  and return null for another tenant's id; no `deleteActivity` UI appears anywhere it would be
  a surprise (dashboard feed rows stay read-only).
- **Effort:** 3–4h. **Risk:** low. **Depends on:** nothing.

### A3. Table column sorting

**JTBD:** "Sort by close date or value without reading every row."

Closes **G3**. TanStack Table is already a dependency and already wired into all three tables;
sorting is a missing configuration, not a new capability. The reference `DataTable` ships it.

- **Implementation:** `useState<SortingState>` + `getSortedRowModel` in `org-table.tsx`,
  `contact-table.tsx`, `deal-table.tsx`. Header cells become buttons with
  `aria-sort="ascending" | "descending" | "none"`.
- **Careful:** the reference implementation documents a real TanStack trap — "derived columns
  must live on the row data, not in an `accessorFn`", because TanStack memoizes its core row
  model on `data` alone and an accessor reading a `useMemo` map keeps stale values. The CRM's
  org/contact-name columns already do the safe thing (an `id` accessor plus a name lookup at
  render time). Keep it that way.
- **Acceptance:** every column header sorts ascending then descending then returns to insertion
  order; `aria-sort` is correct; sorting is client-side only and adds no query param, so the
  existing `?q=` GET forms are untouched; empty states still render.
- **Effort:** 2–3h. **Risk:** low. **Depends on:** nothing. **Pairs well with** A4.

### A4. Edit from the detail page

**JTBD:** "I opened a deal to check the close date — fix it without going back to the list."

Closes **G2**. All three detail pages are read-only. This is the most-felt gap in the app: the
detail page is where you decide something, and today you can only look.

- **Implementation:** reuse the existing forms (`OrgForm`, `ContactForm`, `DealForm`) as dialogs
  on the detail page, exactly as the list tables already do. Each form takes an optional
  existing record plus an `onClose` (`deal-form.tsx:64-80` is the shape). The detail page's `<dl>`
  then needs no changes — `router.refresh()` after save.
- **Watch:** the `DealForm` org/contact `<select>`s need the full org and contact lists, which
  the deal detail page does not currently fetch. `listOrganizationsAction()` and
  `listContactsAction()` are already the pattern.
- **Acceptance:** each detail page has an Edit control that opens the same dialog as its list
  row; a save persists and the `<dl>` reflects it after refresh; Cancel discards; no duplicate
  "Add" affordance appears on a detail page; the existing `Edit {name}` aria-labels keep
  resolving for `e2e`.
- **Effort:** 3–4h. **Risk:** low. **Depends on:** nothing.

### A5. Deal number validation

**JTBD:** "Don't let me save a deal worth negative fifty thousand dollars or closing at 400%."

Closes **G10**. Directly parallel to 9.6's text contracts, which added `assertText` ceilings to
every CRM string field. The numeric fields were never given the same treatment, and
`updateDeal` was left out even for the fields that were.

- **Implementation:** extend `lib/input/text.ts` (or add a sibling `lib/input/numbers.ts` that
  keeps the same shape) with `assertMoney(value, { min: 0, max })` and
  `assertPercent(value, { min: 0, max: 100 })`. Call them in `createDeal` **and** `updateDeal`
  in the barrel, before the memory/Drizzle dispatch — the same placement `short()`/`long()` use
  at `lib/crm/queries.ts:92-98`.
- **Values:** `value >= 0` and finite; `probability` an integer 0–100 (it's a Postgres
  `integer` column and the pipeline renders `{deal.probability}%`, so a float is a latent
  display bug); `value <= 1e12` as a double-precision sanity ceiling, mirroring how
  `MAX_SHORT_TEXT` caps a text field.
- **Acceptance:** `updateDeal` rejects a negative value and a probability of 101; the memory and
  Drizzle paths agree; `STAGE_PROBABILITY` values (0/10/25/50/75/100) all still pass; the
  existing `moveDeal` rebase path is unaffected; the deal form's client-side check stays as a
  nicety and the server is the gate.
- **Effort:** 2–3h. **Risk:** low. **Depends on:** nothing.

### A6. Delete-consequence preview

**JTBD:** "Before I delete this customer, tell me I'll lose their 4 contacts and 2 open deals."

Closes **G11**. `SET NULL` is the right referential choice — deleting an org should not delete
its contacts — but today it is silent. The user gets a `confirm()` naming one row and no warning
that six other rows just became orphans.

- **Implementation:** a `cascadePreview` query helper returning counts of what a delete will
  unlink (`organizations` → contacts + deals; `contacts` → deals referencing them + activities;
  `deals` → activities). Render it inside the existing confirm path. Keep the browser
  `confirm()` for the tests and use a real dialog only if the copy needs to be rich — do not
  build a bespoke confirm component in this feature.
- **Acceptance:** the confirm message names the affected counts when they are non-zero and is
  unchanged when they are zero; the preview is tenant-scoped and counts nothing from another
  tenant; the `SET NULL` behavior itself is unchanged; `onDelete` stays `set null` in the schema.
- **Effort:** 2–3h. **Risk:** low. **Depends on:** nothing. **Nice to have:** offer "detach
  instead" as an alternative to deletion.

---

## Tier B — the list and task surface

Real new capability, no schema change except where noted.

### B1. CRM QuickFind (⌘/Ctrl+K)

**JTBD:** "Type a fragment of anything — a person, a company, a deal — and jump to it."

Closes **G16**. Space 2.7 already ships this exact interaction and the code to copy
(`components/space/quick-find.tsx` + `lib/space/search.ts`). The CRM is the app that most needs
it and has the least of it: four separate `q` boxes, each searching three fields, none of them
searching activities at all.

- **Implementation:** `lib/crm/search.ts` with one `searchAll(tenantId, q)` returning typed
  `{ organizations, contacts, deals, activities }` buckets, each capped (say 5) with a total
  count. Client component modeled on `quick-find.tsx`, mounted in the CRM layout so the shortcut
  works from all five sections.
- **Watch:** `lib/client-boundary.test.ts` forbids a client component value-importing
  `lib/crm/queries.ts`. A pure helper needs its own module and takes its **types** from
  `queries-shared` — this is the exact trap `lib/rolodex/circle-stats.ts` exists to solve.
- **Acceptance:** ⌘K / Ctrl-K opens from any CRM section; results are grouped and each links to
  its detail route; an activity result links to its contact or deal; results are tenant-scoped;
  the `?q=` page filters keep working unchanged; the boundary gate still passes.
- **Effort:** 5–7h. **Risk:** medium (the client-boundary gate is a real tripwire, but the
  recipe is documented).

### B2. Deal filters

**JTBD:** "Show me what's in Negotiation closing this quarter, for one account."

Closes **G4**. `ListDealsOpts` already carries `organizationId` and `contactId` and the Drizzle
module already implements both — they are simply unreachable from the UI. Adding `stage` and a
close-date window extends the same `opts` object, which is the established pattern (the skill
requires extending `listX` with a trailing `opts`, never a parallel `listXBySearch`).

- **Implementation:** add `stage?: DealStage` and `closeBefore?: Date` / `closeAfter?: Date` to
  `ListDealsOpts`; extend `dealSearchSql`'s sibling filter list in `queries-drizzle.ts`; add
  three `<select>`/`<input type="date">` fields to the existing GET form on the deals page,
  matching how `/crm/contacts` already does its `status` select (`contacts/page.tsx:44-62`).
- **Acceptance:** each filter narrows the table and survives a reload through the URL; filters
  compose with `?q=`; an unknown `stage` value is ignored rather than 500ing (copy
  `parseStatus` from `contacts/page.tsx:8-19`); the two-argument callers of `listDeals` still
  typecheck.
- **Effort:** 4–5h. **Risk:** low.

### B3. Follow-ups as a real section

**JTBD:** "Give me one list of everything I owe someone this week, across every contact and deal."

Closes **G6**. `dueDate` + `done` already makes an activity a task, and the dashboard already
computes overdue/upcoming with `followUps(activities, now)`. What's missing is a _surface_: a
dedicated `/crm/tasks` section, and a way to see a window rather than only "overdue" and
"everything ahead".

- **Implementation:** new `lib/crm/tasks.ts` with the pure aggregation (a widened `followUps`:
  overdue / today / next 7 days / later, plus a per-item "overdue by N days" label) and a
  `ListActivitiesOpts` extension (`done?: boolean`, `dueBefore?: Date`, `dueAfter?: Date`). A
  sixth subnav tab reusing the existing `SECTIONS` array in `crm-subnav.tsx:24-81`, and a
  `isCrmSection` entry that already handles the `/x` and `/x/...` cases for free.
- **Also fix:** the dashboard's two panels get a "see all" link to the new section, and the
  follow-up rows gain a link to the activity's contact or deal — the dashboard feed already has
  one (`crm/page.tsx:72-90`) and the follow-up panels do not.
- **Acceptance:** `/crm/tasks` lists every undone activity with a `dueDate`, grouped by
  window; toggling done removes it and persists; a task with no contact and no deal renders
  without a broken link; the dashboard panels still render; `e2e/crm.spec.ts`'s five-tab subnav
  walk is **not** broken by a sixth tab (it clicks by name, so it should not be — verify).
- **Effort:** 6–8h. **Risk:** low-medium. **Note:** this is the one Tier B feature that adds a
  subnav entry, so it touches `crm-subnav.test.ts` and the workroom link-walk in
  `e2e/workroom.spec.ts`.

### B4. Backdate activities + last-contacted

**JTBD:** "Log Tuesday's call on Wednesday, and show me who I haven't talked to in a month."

Closes **G7** and **G8**. Two small things that belong together because they touch the same data.

- **`occurredAt` in the form:** add a date input to `ActivityForm`, defaulting to today, and
  pass it through. `createActivityForSession` already accepts and defaults it — the client just
  never sends one. Also add it to the A2 edit dialog.
- **Last contacted:** a derived `lastContactedAt: Date | null` on the contact detail page,
  computed from the activity list with `compareActivitiesNewestFirst` (already written and
  tested, `queries-shared.ts:168`). Keep it derived — do not add a column that can drift.
  Surface it on the contact table as a sortable column once A3 lands, and flag contacts whose
  last contact is over 30 days.
- **Acceptance:** an activity can be logged with a past `occurredAt` and the timeline sorts it
  correctly; the default is still today; the contact detail shows the date or "No activity yet";
  nothing is stored that could disagree with the activities table.
- **Effort:** 3–4h. **Risk:** low.

### B5. Bounded lists

**JTBD:** "Don't send me 10,000 rows so I can look at the first 50."

Closes **G15**. The honest framing: this is a correctness-of-scaling issue, not a performance
tune. Today every list is an unbounded `SELECT`; the moment a tenant has real volume the page
is unusable and the response is unbounded memory. But the repo's own guidance is to reject scale
boxes until a forcing function exists beyond demo-size Neon RTT — and the demo tenant has 6
deals. So: **do not build this before there is a real tenant with real volume**, and do not
build pagination UI until the query bound exists.

- **Staged plan:** (1) a `DEFAULT_PAGE_SIZE` cap on the list queries with a `limit`/`offset` in
  `ListContactsOpts`/`ListDealsOpts`, invisible in the UI and testable in the query layer;
  (2) later, real pagination controls, following Space 2.6's view-persistence pattern if views
  get a home in CRM.
- **Acceptance for stage 1:** `listDeals` returns at most N rows for a tenant holding more;
  memory and Drizzle paths agree on N; the dashboard's aggregations (which need _all_ rows, not
  a page) are **not** switched to the capped helper — this is the trap: `getDashboard` calls
  `listDeals`/`listActivities` and must keep seeing everything.
- **Effort:** 3–4h for stage 1. **Risk:** medium — a wrong cap silently corrupts the dashboard.

---

## Tier C — schema features (the real unlocks)

These need migrations and seed changes. They are last because each one is a genuine data-model
decision, not a UI gap.

### C1. Deal stage history → velocity, conversion, forecast accuracy

**JTBD:** "How long do my deals actually sit in Proposal, and where do they die?"

Closes **G12**. This is the most valuable feature on the list and the one that unlocks three
others. Every pipeline number the CRM shows today is computed from a deal's _current_ stage, so
the app can never answer a time question. The reference implementation documents the same wall
and works around it: the funnel is cumulative and a conversion funnel is "not buildable on this
schema".

- **Schema:** `dealStageEvents(id, tenantId, dealId, fromStage, toStage, movedAt)` — no
  `boardOrder`, because reorder-within-a-column is not a stage event. Index on
  `(dealId)` and `tenantId`, following 7.3.
- **Write path:** `moveDeal` (`lib/crm/move-deal.ts`) is the single place a stage changes
  through the pipeline. It must append the event, in the **same** `db.batch` as the renumber, or
  the history and the board can disagree. `updateDeal`'s `nextProbabilityOnStageChange` path
  (`queries-shared.ts:187`) is the other — a stage edit from the deal form is equally a stage
  event. Both paths, or the feature is wrong.
- **Read side:** `timeInStage(dealId)` → average days per stage; `stageConversion(from, to)`
  over a window; `forecastAccuracy` = expected vs actual for deals that closed. All pure
  functions in `lib/crm/velocity.ts`, unit-tested with no database — the same split
  `lib/crm/dashboard.ts` already uses, and the same reason (it is what makes them testable).
- **Backfill:** existing rows have no history. Either seed a synthetic initial event
  (`fromStage: null`) or start the clock when the feature ships — decide in the spec, and say
  which in the UI copy if you show averages.
- **UI:** three new dashboard panels (time-in-stage bar, stage conversion, forecast accuracy) or
  a new `/crm/velocity` section. Prefer a section — the dashboard is already four charts plus
  two feeds, and 10.3 established the one-golden-element-per-screen rule.
- **Acceptance:** a drag between columns writes exactly one event; a same-column reorder writes
  none; a stage change from the deal form writes one; the event and the deal update land in one
  batch; averages exclude deals with no history; `isOpen` semantics are unchanged so pipeline
  totals do not move.
- **Effort:** 10–14h. **Risk:** medium-high — the write path has two entry points and getting
  it wrong writes a history that lies.

### C2. Tags on contacts and organizations

**JTBD:** "Mark the accounts I care about, the people I'm nurturing, the deals to revisit in
spring."

Closes **G13**. Explicitly deferred in 1.3, and Rolodex's `tags jsonb` is the in-repo precedent
— but copy the _storage_ decision, not the whole import/cadence machinery around it.

- **Schema:** `tags jsonb.$type<string[]>().notNull()` on `contacts` and `organizations`,
  defaulting to `[]`. **A separate join table is the better call** if tags ever need
  tenant-scoped counts or a tag list page; jsonb wins only if "filter by tag on this record" is
  the whole feature. Decide in the spec and record why.
- **UI:** a tag input on the contact and org forms (chips, free text, no separate tag
  management screen), a tag filter on both list pages, and a tag column in the tables.
- **Acceptance:** tags round-trip; a tag with a comma or a quote in it survives; filtering by
  tag composes with `?q=` and `?status=`; tags are tenant-scoped; the Rolodex `tags` column
  contract (`string[]`, never null) is matched exactly.
- **Effort:** 6–8h. **Risk:** low, if jsonb; medium if a join table.

### C3. CSV import and export

**JTBD:** "Move 400 contacts out of my old spreadsheet, and hand my book to my accountant."

Closes **G14**. Rolodex 3.4/9.5 already solved the hard parts and every one of them is
reusable: Papa Parse, `lib/rolodex/import-limits.ts` (1M chars / 500 rows / 8k notes),
`PERSON_FIELDS`-style client-safe column catalog, column mapping with preview, duplicate
flagging that is untickable, all-or-nothing apply.

- **Import:** organizations first, then contacts (with `organizationId` resolved by name
  match). Reuse the limits module's shape and the duplicate rules — but CRM duplicates are by
  **email** only, because that is what A1 makes unique.
- **Export:** a `GET /crm/contacts/export` route handler streaming CSV of the caller's own
  tenant, reflecting the _active_ filters. This is the one CRM feature that needs a Route
  Handler rather than a server action, and the design doc's route list will need the entry.
- **Watch:** `e2e` import journeys were deliberately skipped in 3.4/8.3 with a recorded reason.
  Say the same here, or write the journey.
- **Acceptance:** a 500-row CSV imports within the limits; a file over the ceiling is refused
  before Papa is called, with 9.5's exact wording; a duplicate email is flagged and cannot be
  applied; an import that fails halfway writes nothing; export contains only the session
  tenant's rows and respects active filters.
- **Effort:** 10–12h. **Risk:** medium. **Depends on:** A1 (duplicate semantics).

### C4. Won/lost reasons

**JTBD:** "I keep losing on price — tell me that."

Small, sharp, and it makes the existing win/loss donut actually actionable. Today `Lost` is a
terminal stage with no explanation, so the dashboard can say _that_ deals are lost and never
_why_.

- **Schema:** `wonLostReason text` (nullable, `MAX_SHORT_TEXT` via `assertText` at the barrel,
  per 9.6) on `deals`, plus an optional `lostCompetitor` if the user wants it. Guard it in
  `moveDeal` and the deal form's Won/Lost branch; it stays null otherwise.
- **UI:** a reason input that appears when stage is Won or Lost, a "top loss reasons" panel on
  the dashboard, and a reason column on the deals table.
- **Acceptance:** a reason is only accepted for Won/Lost; clearing a stage back to open clears
  it; the panel groups by reason with counts; free text passes `assertText` and is rendered as
  text, never as HTML.
- **Effort:** 4–6h. **Risk:** low.

### C5. Link a CRM contact to a Rolodex person

**JTBD:** "Ana Ruiz is one person, not two — her work calls and her birthday reminder should be
one record."

**The highest-leverage idea here and the one needing the most care.** Atrium ships two personal
CRM-shaped apps with no relationship between them: `lib/rolodex/people.ts` and
`lib/crm/contacts.ts` are separate tables with separate tenancy checks, and the same human can
easily be in both. The contact detail page could show the Rolodex timeline (last contact,
birthday, gifts, connections) next to the CRM activity timeline.

- **Why it is a decision, not a feature:** this crosses a module boundary that ADR-0001's
  modular-monolith quantum (app + shared DB) is built to keep clean. It needs its own decision
  record: does the CRM reach into Rolodex's query layer, or is the link a shared
  `lib/people/` service both apps read? The second is cleaner and is a bigger change.
- **Schema options:** (a) a `contactId` column on `people` (one-directional, Rolodex owns the
  link, CRM reads it); (b) a `personId` on `contacts`; (c) a separate `personLinks` table.
  Option (a) keeps CRM's schema untouched and matches the direction the data flows for display.
- **Watch:** both sides must keep their own `tenantId` check. A cross-app read that skips
  `requireTenantId` is the exact bug 7.5's boundary test exists to prevent, and it would reach
  across two modules.
- **Acceptance (once decided):** the contact detail shows the linked person's last-contacted
  date and important dates; no link is ever followed across tenants; the Rolodex app is
  unaffected when no link exists; `Reset demo` wipes the link with both sides.
- **Effort:** 8–12h **after** the decision. **Risk:** high — do not start without the ADR.

---

## Suggested sequencing

If you want a Phase 11, this is the cut I'd defend. It is small enough to ship in one phase,
entirely inside the existing architecture, and it closes every dead-end in the CRM before adding
a single new data model.

| ID    | Feature                                             | Tier | Effort | Depends on |
| ----- | --------------------------------------------------- | ---- | ------ | ---------- |
| 11.1  | CRM e2e coverage for pipeline + activities + deals  | —    | 4–6h   | nothing    |
| 11.2  | Deal number validation (A5)                         | A    | 2–3h   | nothing    |
| 11.3  | Activity delete and edit (A2)                       | A    | 3–4h   | nothing    |
| 11.4  | Table column sorting (A3)                           | A    | 2–3h   | nothing    |
| 11.5  | Edit from detail pages (A4)                         | A    | 3–4h   | 11.4       |
| 11.6  | Contact email uniqueness + duplicate pre-check (A1) | A    | 4–6h   | nothing    |
| 11.7  | Delete-consequence preview (A6)                     | A    | 2–3h   | nothing    |
| 11.8  | Backdate activities + last-contacted (B4)           | B    | 3–4h   | 11.3       |
| 11.9  | Deal filters (B2)                                   | B    | 4–5h   | nothing    |
| 11.10 | Follow-ups section (B3)                             | B    | 6–8h   | 11.8       |
| 11.11 | CRM QuickFind (B1)                                  | B    | 5–7h   | nothing    |

Long pole: 11.1 → 11.4 → 11.5, then 11.3 → 11.8 → 11.10. The rest are order-free (disjoint
file sets apart from the tables in 11.4/11.5, which must not run in parallel).

**Phase 12 candidate:** C1 (stage history → velocity), which is large enough to be its own phase
with C4 (won/lost reasons) as a cheap rider. **Phase 13 candidate:** C2 + C3 (tags, then import /
export, in that order because import's duplicate semantics depend on a unique email).

**Needs a decision before it can be specced:** C5 (CRM ↔ Rolodex link) — ADR first, feature
second.

---

## Explicitly not recommended

- **Multi-currency.** The reference is USD-only by decision, and `formatMoney` is one
  `Intl.NumberFormat`. Adding a currency column means storing the rate or the FX date to make
  historical totals honest. Enormous, and wrong for a personal CRM.
- **Email or calendar integration.** Deferred in 1.7, and it needs a mailer — which is a locked
  non-goal (`HANDOFF.md` "Open decisions carried forward").
- **Custom fields (user-defined, per-tenant).** 1.3 excluded it for good reason: it is an EAV
  schema, a form builder, a filter builder, and a migration story. Tags (C2) gets 80% of the
  value for 15% of the cost.
- **Configurable pipeline stages.** Excluded in 1.6. It breaks `STAGE_PROBABILITY`, the funnel
  ordering, the board's six-column grid, and the six stage CSS classes. It is a v2 product
  change, not a feature.
- **AI features / lead scoring.** The reference excludes them from v1. A scoring model over 6
  deals is theatre, and it would need an API key and a data-egress decision.
- **A second drag library or a component library.** Locked by `AGENTS.md` and the phase-10
  decision not to add one.
- **Soft deletes / a recycle bin.** Tempting for G11, but it doubles every list query's filter
  and every seed's wipe. The consequence preview (A6) gets most of the safety for none of that.
- **Anything touching RLS, session revocation, OAuth, or a mailer.** All named non-goals in
  `HANDOFF.md` and locked ADRs. Not features; reopening one needs its own reversal trigger.

---

## How to verify any of this before you build it

The feature set was derived by reading `lib/crm/`, `components/crm/`,
`app/(authenticated)/crm/`, `e2e/crm.spec.ts`, and the reference implementation's
`docs/crm/{REQUIREMENTS,IMPLEMENTATION}.md`. **No code was changed and no test or build was run
for this document** — it is a proposal, not a change.

Before implementing, re-verify the specific gap in the files named above; CRM code will move.
The mechanical checks that produced G3, G9, G15, and G16 are cheap greps and can be repeated in
seconds:

- `getSortedRowModel|SortingState` in `components/crm/` → A3's premise
- `deleteActivityAction` in `lib/crm/` → A2's premise
- `limit(` in `lib/crm/queries-drizzle.ts` → B5's premise
- `uniqueIndex` in `lib/crm/schema.ts` → A1's premise
- `dateRange|timeInStage|conversion` in `lib/crm/` → C1's premise
