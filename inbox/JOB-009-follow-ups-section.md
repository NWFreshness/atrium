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


Numbered criteria below are the contract for this job. They were lifted from the retired phase-11 spec when that board was removed.

1. `components/crm/crm-subnav.tsx`'s `SECTIONS` has a sixth entry with
   `href: "/crm/tasks"`, `label: "Tasks"`, and an `icon: icon(…)` glyph, and
   `lib/crm/nav.ts` is **unmodified** — `isCrmSection("/crm/tasks", "/crm/tasks")`
   and `isCrmSection("/crm/tasks/anything", "/crm/tasks")` are both `true` on the
   existing implementation
2. `app/(authenticated)/crm/tasks/page.tsx` exists, renders
   `atrium-pagetitle` with `<h1>Tasks</h1>` and
   `<p className="atrium-sub">Everything you owe, across every contact and deal</p>`,
   and declares no `searchParams`
3. `lib/crm/tasks.ts` is pure: it imports only `import type { Activity }`
   from `./queries-shared`, never calls `new Date()` internally, and exports
   `TASK_WINDOWS`, `TaskWindow`, `Task`, `TaskBucket`, `dayNumber`,
   `taskBuckets`
4. `lib/crm/tasks.test.ts` — `taskBuckets` at
   `now = 2026-09-07T15:00:00.000Z` puts `2026-09-06T23:59:59.000Z` in `overdue`,
   `2026-09-07T00:00:00.000Z` in `today`, `2026-09-14T00:00:00.000Z` in `next7`
   (**+7, the inclusive bound**), and `2026-09-15T00:00:00.000Z` in `later`
5. `lib/crm/tasks.test.ts` — `done: true` and `dueDate: null` activities
   appear in no bucket, and `taskBuckets([], now)` still returns four buckets in
   `["overdue", "today", "next7", "later"]` order, each with its own heading and
   a **distinct** empty string
6. `lib/crm/tasks.test.ts` — `overdueByDays` is `1` for a task one day past,
   `7` for one seven days past, and `null` outside the overdue window; and the
   total item count across the four buckets equals the pending count, so no task
   appears twice
7. `lib/crm/tasks.test.ts` — a window with three tied `dueDate`s returns them
   in ascending `id` order, and `dayNumber(new Date("2026-09-29"))` equals
   `dayNumber(new Date("2026-09-29T00:00:00.000Z"))` and does **not** equal
   `dayNumber(new Date("2026-09-29T00:00:00"))`
8. `lib/crm/tasks.test.ts` — the `agrees with the dashboard's followUps on
   the overdue boundary` case passes against the same two activities
   `lib/crm/dashboard.test.ts:378-393` already uses, and
   `lib/crm/dashboard.test.ts` is **unmodified** and still green
9. The four window headings render as `<h2>` with accessible names exactly
   `Overdue`, `Today`, `Next 7 days`, `Later`; the count is a **sibling** of the
   `<h2>`, not inside it, and is **absent** when the window holds one task
10. `components/crm/task-list.tsx` is `"use client"`, imports `Activity` as
     `import type` from `@/lib/crm/queries-shared`, imports `truncate` from
     `@/lib/crm/activity-labels`, and `lib/client-boundary.test.ts` is green —
     i.e. it has **no** value import of `lib/crm/queries`, `lib/crm/schema`,
     `lib/db`, `drizzle-orm`, or `@neondatabase/serverless`
11. The task row's Done checkbox `aria-label` template is **byte-identical**
     to the one in `components/crm/activity-timeline.tsx` at implementation
     time, including its `truncate` call and argument; a reviewer diffing the two
     files finds no difference, and `task-list.test.ts` asserts the source
     contains `truncate(activity.description, 60)`
12. A task with a contact renders exactly one link whose text is the
     **contact's name** (not `Contact`) and whose `href` is
     `/crm/contacts/{id}`; a task with no contact but a deal renders one link
     with the deal's name and `/crm/deals/{id}`; a task with neither renders
     **no** `<a>`, and the source contains no `href={""}` or `href="#"`
13. The meta line is `Due {formatDate(dueDate)}`, with
     ` · Overdue by N day` / ` · Overdue by N days` appended only in the
     `overdue` window
14. Toggling the checkbox calls `toggleActivityDoneAction(id, !done)` then
     `router.refresh()`, disables that row's checkbox while in flight, and the
     row leaves the list — `onChange` writes `void onToggle(activity)` and the
     handler `async`, exactly as `activity-timeline.tsx:46-54` does
15. `components/crm/dashboard-followups.tsx` renders `See all overdue` and
     `See all upcoming` (two **distinct** strings) as `next/link`s with
     `href="/crm/tasks"`, placed in each panel's heading row, with both `<h2>`
     texts byte-identical to today and both empty strings unchanged
16. `components/crm/crm-pass.test.ts` — the new assertion finds
     `"/crm/tasks"` and `label: "Tasks"` in the subnav source, and asserts
     `href:` count `=== 6` `===` `icon: icon(` count; its three existing `it`s
     are unmodified and green
17. `components/crm/crm-pnw.test.ts` — `PAGES` has six entries including
     `app/(authenticated)/crm/tasks/page.tsx`; the new golden-element assertion
     passes; **`:190-193`'s existing assertions are unmodified** and still pass
     (`subnav.match(/atrium-subtab-active/g)` is still `toHaveLength(1)`); and
     the new page satisfies the `atrium-pagetitle` + `className="atrium-sub"`
     assertion at `:260-265`
18. `e2e/crm.spec.ts:53` walks five names, `Tasks` last, and its four
     existing tests are otherwise unmodified; `e2e/workroom.spec.ts` has
     `{ name: "Tasks", href: "/crm/tasks", url: /\/crm\/tasks$/ }` in
     `CRM_SUBNAV` and `{ path: "/crm/tasks", h1: "Tasks" }` in `WALK`
19. `e2e/crm-tasks.spec.ts` has two tests: the read-only one asserts the
     `<h1>`, the sub-line, `aria-current="page"` on the Tasks tab, all four
     `<h2>`s, the **seeded** `Intro call scheduled for next week.` inside the
     `Overdue` section, and `a[href=""], a[href="#"]` count 0; the mutating one
     mints a `Date.now()`-described task due two days out, finds it in
     `Next 7 days` and **not** in `Today` or `Later`, checks it off, and asserts
     it is still gone after a `page.reload()`, then deletes it in `afterEach`
20. No test in `e2e/crm-tasks.spec.ts` asserts an exact row count, writes in
     `beforeAll`, or uses `waitForTimeout`; every post-navigation assertion
     carries `{ timeout: NAV_TIMEOUT }`; both tests start with
     `test.setTimeout(60_000)`
21. `lib/crm/nav.test.ts` has cases for `/crm/tasks` exact and against two
     sibling hrefs, and its existing cases are unmodified
22. New classes are `.crm-task-head`, `.crm-task-count` (in
     `components/crm/org.module.css`) and `.feedHead` (in
     `components/crm/dashboard.module.css`), all `crm-`-prefixed and token-only —
     no hex, no new token, no brass, no `atrium-*` re-declared;
     `tests/workroom-namespace.test.ts` is green with **no** edit
23. The only semantic tone is `--clay-ink` on the `Overdue` heading and the
     `Overdue by N days` label, matching `.feedTitleLate`'s
     `var(--clay-ink)` — the words carry the meaning, and
     `components/crm/crm-pnw.test.ts:117-120` still passes
24. `components/crm/crm-pnw.test.ts`, `components/crm/crm-pass.test.ts`,
     `components/crm/activity-timeline.test.ts`, `components/crm/contact-table.test.ts`,
     `lib/crm/dashboard.test.ts`, `lib/crm/activity-actions.test.ts`,
     `lib/crm/contact-actions.test.ts`, `lib/client-boundary.test.ts`,
     `tests/theme-contrast.test.ts`, `tests/workroom-namespace.test.ts`, and
     `tests/crm-shell.test.ts` are all green with no edits
25. **Tenant scoping:** 11.9 adds **no** query helper and no server action.
     Its three data reads are the existing `listActivitiesAction()`,
     `listContactsAction()`, and `listDealsAction()`, each of which calls
     `requireTenant` internally (`lib/crm/activity-actions.ts:124-128`,
     `lib/crm/contact-actions.ts:109-114`, and the `listDealsAction` wrapper).
     `lib/crm/activity-actions.test.ts` and `lib/crm/contact-actions.test.ts`
     are green **unmodified**, which is the evidence for tenant scoping here;
     `taskBuckets` is pure over the array it is handed and has no tenant of its
     own to scope
26. **Injection-proven, each probe reversed byte-identically and the result
     recorded in the shipped notes:**
     (a) change the `next7` bound to `<` instead of `<=` →
     `lib/crm/tasks.test.ts` case 4 fails on the `+7` activity moving to `later`;
     (b) drop the `!activity.done` filter → case 5 fails;
     (c) drop `excludeId`-style tie-breaking, i.e. make `compareByDueDateThenId`
     return `0` for a tie → case 5's ordering test fails;
     (d) render `<Link href="">` in the `null` branch of the link chain →
     `components/crm/task-list.test.ts` case 12 fails, and the Playwright dead
     link assertion (`toHaveCount(0)`) fails;
     (e) remove `Tasks` from `CRM_SUBNAV` in `e2e/workroom.spec.ts` → the
     `href`/`aria-current` assertions in the new spec's Journey 1 fail.
     **A gate that cannot be broken by injection is a gate that is not running**
27. `AUTH_SECRET=ci-build-placeholder npm run build` exit 0 **before**
     `env -u DATABASE_URL npm test`, because `vitest` does not typecheck and
     `next build` is what typechecks `e2e/` and the server/client prop boundary
28. `AUTH_SECRET=local-playwright-secret npx playwright test
     e2e/crm.spec.ts e2e/workroom.spec.ts e2e/crm-tasks.spec.ts` green with the
     dev `.env` creds, after confirming nothing foreign owns `:3000`
     (`playwright.config.ts:31` reuses an existing server)
29. No new dependency; no table component touched; no `ListActivitiesOpts`
     field added; no parallel `listTasks*` helper; no Tailwind, shadcn, TanStack
     Query, or TanStack Router; no pagination; no `confirm()` replacement

## Verify command

Run from the repo root.

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
