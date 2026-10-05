# JOB-009 — Tasks section, sixth CRM tab (11.9)

## Goal

A new `/crm/tasks` route, surfaced as a sixth `Tasks` tab in the CRM subnav,
lists every undone activity with a `dueDate`, grouped by window — overdue,
today, next 7 days, later — so a `dueDate` stops being a field on an activity
and becomes a thing with a surface. The dashboard's two follow-up panels
gain "see all" links to the new section. Closes **G6**. **Only one new
route** in the whole Phase 11.

## Scope paths

```
app/(authenticated)/crm/tasks/page.tsx              # new — the only new route
app/(authenticated)/crm/tasks/tasks.tsx             # or co-located component, per spec
components/crm/tasks-table.tsx (or equivalent)      # new — the grouped list
components/crm/crm-subnav.tsx                        # append Tasks to SECTIONS
components/crm/dashboard-followups.tsx               # "See all" link on each panel
lib/crm/tasks.ts                                     # new — pure aggregation (overdue / today / next 7 days / later)
lib/crm/tasks.test.ts                                # new — window boundaries, calendar-day semantics
lib/crm/queries-shared.ts                            # ListActivitiesOpts gains done?, dueBefore?, dueAfter?
lib/crm/queries.ts                                   # listActivities respects new opts
lib/crm/queries-memory.ts                            # new branch
lib/crm/queries-drizzle.ts                           # new branch
lib/crm/queries.test.ts                              # window edges; STAGE_PROBABILITY-style assertion table
lib/crm/dashboard.ts                                 # followUps(...) may be widened or replaced — see Spec §"Follow-ups derivation"
app/(authenticated)/crm/page.tsx                     # the existing follow-up panel "See all" link to /crm/tasks
features/phase-11-crm-integrity/11.9-follow-ups-section.md
features/INDEX.md
CURRENT_FEATURE.md
```

Branch convention: ship on `feat/11.9-follow-ups-section`. Never commit or
push to `main`. Never merge unless the user asks.

## Out of scope

- **Renaming dashboard strings.** `components/crm/dashboard-followups.tsx:77`'s
  `No overdue follow-ups` stays — recorded copy drift between the dashboard
  ("follow-ups") and the new tab ("Tasks"). Renaming inside this card is more
  expensive than the drift.
- **Editing `e2e/crm-pipeline.spec.ts`** or the activities e2e spec.
- **The `?q=` page filter** on `/crm/tasks`. The route is **not**
  text-filterable by this card's ruling.
- **A QuickFind palette.** 11.10.
- **Editing the activity timeline on contact/deal detail.** That is 11.3's
  surface.
- **Editing `lib/crm/dashboard.ts` aggregations beyond the follow-ups widening.**
  The trailing-6-month wins, cumulative funnel, and top-org charts are
  unaffected.
- **Any change to `components/crm/dashboard.module.css` colors** beyond a
  single "See all" link tone if needed.

## Acceptance criteria

The full criteria are in `features/phase-11-crm-integrity/11.9-follow-ups-section.md`
§"Acceptance criteria". The card defends every item.

1. **A sixth `SECTIONS` entry** in `components/crm/crm-subnav.tsx:24-81`:
   `href: "/crm/tasks"`, `label: "Tasks"`, with an inline SVG glyph in the
   same shape as the other five. `isCrmSection` (in `lib/crm/nav.ts:1-6`)
   needs **no change** — it already returns true for an exact path and for
   anything under it.
2. **The route** `app/(authenticated)/crm/tasks/page.tsx` exists, is a server
   component, fetches all undone activities with a `dueDate`, and renders the
   four windows.
3. **`lib/crm/tasks.ts`** exports the pure aggregation (overdue, today, next
   7 days, later) and a per-item "overdue by N days" label. Calendar-day
   semantics match `utcDateOnly` at `lib/crm/dashboard.ts:86-88`.
4. `ListActivitiesOpts` extends to `done?: boolean`, `dueBefore?: Date`,
   `dueAfter?: Date`. Both stores implement the new branches. **No parallel
   `listActivitiesByWindow` helper.**
5. A task with **no contact and no deal** renders without a broken link.
6. Toggling done removes it from the list and persists across a reload.
7. **The dashboard's two panels** (`components/crm/dashboard-followups.tsx`
   overdue + upcoming) each gain a "See all" link to `/crm/tasks`.
   `app/(authenticated)/crm/page.tsx` — same.
8. **`e2e/crm.spec.ts`'s five-tab subnav walk is not broken by a sixth tab.**
   The existing walk clicks by name and is unaffected; **this is verified,
   not assumed.**
9. **No "follow-ups" rename** in the dashboard. The drift is recorded, not
   fixed.
10. `tests/workroom-namespace.test.ts` stays green. The new module lives
    under `components/crm/` or `app/(authenticated)/crm/`.
11. The new route passes `npm run build` (`next build` typechecks routes).
12. **Injection-proven, the relevant probe reverted byte-identically:**
    removing the `done` filter from `listActivitiesInMemory` makes a unit
    test that asserts done tasks are excluded go green (vacuous green is the
    failure mode this exists to catch).

## Verify command

Per the spec.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm.spec.ts
```

Build before test. The Playwright invocation is `e2e/crm.spec.ts` (the existing
subnav walk) — this card does not add a new spec file unless it adds a
journey, which is the spec's decision (verify and read before claiming).

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** The existing `followUps` aggregation
is at `lib/crm/dashboard.ts:192-214`, consumed by exactly one caller —
`DashboardFollowUps` on the dashboard (`app/(authenticated)/crm/page.tsx:98-101`).
The dashboard copy that stays is at
`components/crm/dashboard-followups.tsx:77` (`No overdue follow-ups`). The
five existing `SECTIONS` entries are at
`components/crm/crm-subnav.tsx:24-81`. `isCrmSection` is at
`lib/crm/nav.ts:1-6`.

**Calendar.** Sits behind `feat-001` (11.1) **and** JOB-007 (11.3). The
long pole puts 11.3 before 11.9; 11.9 mounts the same activity timeline 11.3
completes. The acceptance criterion is "`/crm/tasks` lists every undone
activity with a `dueDate`", which is only meaningful once 11.3 has shipped
the activity delete + edit affordances and the toggle-done wiring that makes
"done" a real state to filter on.

**Why this is the only new route in Phase 11.** The design doc ruling:
exactly one new route in the whole phase. QuickFind is layout-mounted; the
sixth tab is the missing follow-up section. A seventh tab is out.

**Recorded limits, carried from the spec:** dashboard strings keep saying
"follow-ups" — recorded copy drift; the new route is not text-filterable;
the activity timeline on contact/deal detail is not edited; the dashboard
follow-ups panels keep their `No overdue follow-ups` / `No upcoming follow-ups`
copy; pagination on the activities list is a phase non-goal; bounded lists
are out (B5).

**Carried from session 1 (`progress.md`):** the 3 orphaned activities per
`e2e/crm-activities.spec.ts` run defect is 11.3's; this card assumes
Reset demo before its Playwright run, like every other Phase 11 card.