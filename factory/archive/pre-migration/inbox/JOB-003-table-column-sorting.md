# JOB-003 — Sort CRM table columns (11.4)

## Goal

All three CRM tables (`/crm/organizations`, `/crm/contacts`, `/crm/deals`)
register v9 TanStack sorting (`rowSortingFeature` + `createSortedHeader
gestures()`), header buttons cycle through `aria-sort` ascending → descending
→ none, and sorting is **client-side only** on the rows the server already
returned. Closes **G3**. No new query param, no `?sort=`, no server-side
ordering.

## Scope paths

```
components/crm/org-table.tsx
components/crm/contact-table.tsx
components/crm/deal-table.tsx
components/crm/org.module.css                                  # .crm-sort / caret, crm- prefixed
e2e/crm-deals.spec.ts                                          # appended; file owned by JOB-002
components/crm/org-table.test.ts, contact-table.test.ts, deal-table.test.ts  # if present, fence v8 API names
```

Branch convention: ship on `feat/11.4-table-column-sorting`. Never commit or
push to `main`. Never merge unless the user asks.

## Out of scope

- **`?sort=` or any query param.** Sorting is client-side; the `?q=` GET forms
  on the three list pages are untouched.
- **A sort control in the toolbar.**
- **Server-side sorting or pagination.** Lists stay unbounded (B5 is a phase
  non-goal).
- **The pipeline board.** `PipelineBoard` orders by `boardOrder` and is not a
  table.
- **A `Last contacted` column.** 11.3 owns that; this card has no new column
  to wire.
- **Row actions.** `Edit {name}` / `Delete {name}` aria-labels stay.
  Components-crm/org-table.tsx:54, `:61`; contact-table.tsx:77, `:84`;
  deal-table.tsx:108, `:114`.
- **Edit on the list page.** 11.5 owns detail-page Edit. **This card touches
  headers only.**
- **Anything in `lib/crm/queries-drizzle.ts` or the list pages themselves.**
- **Screenshot goldens.**
- **Running this card in parallel with 11.5** — the design's serial rule
  holds even though 11.5 will end up not touching the three table files.

## Acceptance criteria

1. All three tables register `rowSortingFeature` and `createSortedHeader
   gestures()` in `tableFeatures({...})`. **v9 only** — the installed
   `@tanstack/react-table` is `^9.2.4` (`package.json:23`).
2. Zero matches for `getSortedRowModel` / `onSortingChange` /
   `useState<SortingState>` in `components/crm/`. v8 fossil names.
3. Every data-column header cycles to `aria-sort="ascending"`, then
   `"descending"`, then `"none"`. First-click direction pinned per column
   (text asc; `Value` and `Close date` desc-first via `sortDescFirst: true`).
4. `aria-sort` lives on the `<th>`, not on the button. The Actions `<th>`
   has no `aria-sort` and no button (`enableSorting: false`).
5. Sorting is client-side; no new query param; `?q=` GET forms unmodified.
   `page.url()` after a header click equals `page.url()` before it.
6. Org/contact-name accessors remain ids; name lookups happen at render time.
   No `accessorFn` closing over `orgNames` / `contactNames`. Use a `sortFn`
   that reads the same map if sorting by visible name.
7. Empty states still render (`No organizations` / `No contacts` / `No deals`).
   Sort cannot hide an empty state.
8. Existing `Edit {name}` / `Delete {name}` aria-labels pass `git diff` byte
   comparison.
9. Sorting assertions live in `e2e/crm-deals.spec.ts` (the file JOB-002
   created) — this card appends a journey and does **not** create a fourth
   spec file.
10. **Injection-proven, both probes reverted byte-identically:** dropping
    `rowSortingFeature` while keeping `sortedRowModel` makes `npm run build`
    fail; sorting Organization by raw uuid makes the contacts e2e monotone-name
    assertion fail (or vacuous — if vacuous, the test is wrong).

## Verify command

Build before Playwright.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-deals.spec.ts
```

`e2e/crm-deals.spec.ts` must exist (JOB-002 creates it). If JOB-002 has not
landed yet, this card cannot ship — record the journey unmet and do not
invent a fourth spec file.

## Done evidence

**`passing` — verified 2026-10-05T22:33:36Z (session 16).**
`env -u DATABASE_URL npm test && AUTH_SECRET=*** npm run build && AUTH_SECRET=*** npx playwright test e2e/crm-deals.spec.ts`
— **exit 0**. S1 `Test Files 115 passed (115)` / `Tests 970 passed (970)`; S2
exit 0 (typechecks `e2e/`); S3 `6 passed (17.5s)`, **0 skipped**, all four new
journeys named (`:338` `:382` `:425` `:455`). Review APPROVE-FOR-VERIFY in
session 15, A–G all PASS, 10/10 acceptance criteria checked against the files.
Both AC10 probes re-confirmed non-vacuous in session 14 and md5-reverted.

## Review

**2026-10-05 (session 15) — APPROVE-FOR-VERIFY.** A Scope PASS · B Acceptance
PASS 10/10, every criterion checked against the files rather than the
implementer's notes · C Verify hook PASS, all three stages reach the change ·
D Evidence discipline PASS, no `passing`/`testedAt` written · E Harness intact
PASS · F Bans PASS, no test deleted or weakened · G Restartability PASS.

One cosmetic defect reported and left for `/factory-implement`:
`feature_list.json` was written through a Python `json.dump` that escaped all
non-ASCII (9 `\uXXXX` sequences, 0 literal em-dashes where `HEAD` had 2). A
parsed comparison confirms no value changed and the JSON is valid; the diff
churn is 12 added / 12 removed where 5 lines were needed.

Two wording notes for whoever reads this card next. **AC1 names
`createSortedHeader gestures()`, which does not exist in v9.2.4** — see
`## Notes`. **AC2 says "zero matches in `components/crm/`"** and the literal
reading fails on this card's own fence files, which contain the fossil strings
as assertion literals; the substantive check is zero matches in
`components/crm/*.tsx`, and that is what holds.

## Notes

**Calendar.** Sits behind `feat-001` (11.1). 11.4 is the first feature on the
long pole after 11.1; it ships before 11.5 (Edit from detail) and before 11.3
(Activity correct-and-complete, which adds a `Last contacted` column to
`contact-table.tsx`). **The 11.4/11.5 serial rule held: 11.5 was not started,
and nothing outside this card's 8 files was touched.**

**Files this card shares with 11.3.** `contact-table.tsx` is the only table
file both 11.4 and 11.3 modify. 11.3's spec is explicit: its `Last contacted`
column ships as a `display` column with no `accessorFn`, **unsortable**. 11.4
makes it sortable in its own per-column pass, if 11.4 lands first. The board
rule (one `in_progress` at a time) is the only thing keeping these two
features honest.

**Recorded limits, carried from the spec and unchanged:** sort does not
survive reload; no `?sort=`; no `ORDER BY`; no Last-contacted column to sort
(this card); no multi-sort (`enableMultiSort: false`); pipeline is not a
table; lists stay unbounded; screen-reader announcement quality is unproven
(structure is specified and asserted, NVDA/VoiceOver were not run).

**Spec citations verified at intake.** `package.json:23` is
`@tanstack/react-table@^9.2.4`. `org-table.tsx:16`, `contact-table.tsx:16`,
`deal-table.tsx:17` were the empty `tableFeatures({})` calls. The `<th>`
blocks were `org-table.tsx:93-105`, `contact-table.tsx:116-128`,
`deal-table.tsx:147-159`. The name-lookup pattern was at
`contact-table.tsx:58-67` and `deal-table.tsx:79-98`. All read from the
working tree; the three `<th>` blocks and both name-lookup blocks are the
ones this card rewrites.

**`createSortedHeader gestures()` does not exist in v9.2.4 — AC1 as written
names an API that is not there.** This card's own fossil warning applies to
its own acceptance criterion: the header control is
`column.getToggleSortingHandler()` (a `<th>`-level method on the sorting
feature, `rowSortingFeature.types.d.ts`), and `header` carries only `column`
/ `isPlaceholder` / `getContext`. Verified by grepping
`node_modules/@tanstack/react-table/dist/*.d.ts` and
`node_modules/@tanstack/table-core/dist/` for `createSortedHeader` /
`sortedHeaderGestures` / `SortedHeader`: **no matches**. The Goal sentence in
this card, AC1's parenthetical, and the spec's §1 heading all repeat it.
Implemented as `getToggleSortingHandler()`, which is what the v9 migration
skill maps to and what the spec's own §3 already specifies ("`onClick={header.column.getToggleSortingHandler()}`"). The fossil here is the card's word, not the code's.

**AC10 probe 1 came back as the card predicts, with one addition.** Dropping
`rowSortingFeature` while keeping `sortedRowModel:` fails `npm run build` with
exit 1 and three distinct errors, not one:
`TS2322 … 'sortedRowModel' requires 'rowSortingFeature' to be included in this
table's features`, plus `TS2353` on every `sortFn:` and
`enableSorting:` column option — because without the feature the column-def
type has no sorting options at all.

**AC10 probe 2 is not vacuous.** Swapping
`sortFn: sortByOrgName(orgNames)` for `sortFn: sortFn_alphanumeric` on the
contacts Organization column (i.e. sorting the raw uuid) turns
`crm-deals.spec.ts:452` red with a concrete diff — `"Northwind Logistics"`
rendered first instead of last. The seeded org names sort in the opposite
order from their uuids, so this assertion genuinely bites.

**Three measurements that contradict or refine the spec, all now pinned in
code comments:**

1. **`sortUndefined` alone does not park a `null` close date.** v9 tests
   `=== void 0` (`createSortedRowModel.js`, `aValue === void 0`), and CRM
   stores `closeDate` as `null` (`lib/crm/schema.ts:81`), so the optional
   never fires. Measured over `{null, Jan 14, Feb 28}`: with
   `sortUndefined: "last"`, ascending gives `null, Jan 14, Feb 28` and
   descending `Feb 28, Jan 14, null` — blanks last both ways. The spec's
   `?? undefined` suggestion would also work but needs the accessor changed,
   which would change the cell's `null` contract (11.2's Journey G asserts on
   it). `sortUndefined: "last"` was chosen as the smaller change.
2. **`sortDescFirst: true` does what the spec says.** Measured over
   `{Beta 100, Alpha 900, Gamma 500}`: Value click 1 → `desc`,
   click 2 → `asc`, click 3 → unsorted. Text column click 1 → `asc`. The
   three-click cycle comes from v9's `enableSortingRemoval` default (`true`),
   which the card asks to leave alone; that is now asserted absent in
   `deal-table.test.ts` so the reliance is deliberate rather than accidental.
3. **`sortFn: "auto"` is data-dependent.** The auto resolver samples the
   first ten rows and picks a built-in. Measured over
   `["Zeta","alpha beta","Alpha","10 x","2 x"]` it yields
   `10 x, 2 x, Alpha, Zeta, alpha beta`. Every text column therefore pins
   `sortFn_alphanumeric` instead.

**One defect the browser gate caught that no source grep could: a bare
`sortFn` is not a value comparator.** `sortNumber` was first written as a
plain `(a, b) => …` arrow. v9 calls an unwrapped `sortFn` as
`(rowA, rowB, columnId)`, so it received two Row objects, `Number(row)` was
`NaN`, and every comparison returned a constant — `aria-sort` said
`"descending"` while the column rendered in server order. Isolated
measurement: `18000 / 5000 / 120000` came back unsorted bare, and
`120000 / 18000 / 5000` wrapped in `constructSortFn`. Fixed by wrapping;
`deal-table.test.ts` now fences the wrapping, and the Playwright Value
journey is the behavioural backstop. Same reason `sortByName` uses
`constructSortFn` + `resolveDataValue` rather than a bare arrow.

**AC4 needed a stricter reading than "has none".** A `<th>` cannot have a
missing `aria-sort` and still satisfy "every sortable `<th>` carries one" by
accident: rendering `aria-sort="none"` on Actions would claim a sortable
column that cannot sort. Measured in Chromium before the fix — Actions was
rendering `aria-sort="none"`. All three tables now gate on
`getCanSort()` with an `undefined` fallthrough, so the attribute is absent
on Actions, and the three source tests pin that gate.

**Two e2e traps hit and recorded, both worth keeping for whoever appends to
this file next:**

- `innerText` on a `<th>` returns the **rendered** text, and
  `.crm-table th` sets `text-transform: uppercase` — so a header read is
  `"VALUE"`, not `"Value"`. `columnIndex` uses `textContent` instead. This
  failed all four new journeys on their first run while the `aria-sort`
  assertions above it passed.
- The `Edit`/`Delete` buttons live in `<td>`, so a `td:nth-child(n)` column
  read must be paired with a header-position lookup; the header order and
  the cell order are the same because both come from one column def list.

**Pre-existing, reproduced on clean `origin/main`, not this card's.** Running
the sibling CRM specs surfaced
`crm-pipeline.spec.ts:190` red because the seeded deal
`Harbor & Lane intake` had drifted to stage `Qualified` (read straight from
Neon; `seed.ts:170` says `New`). Confirmed by stashing every change in this
card and re-running: **1 failed on clean `main` too**. Cause is demo-tenant
drift from an earlier drag journey, not code. Applied the documented remedy
— Reset demo as the demo user — and the tenant is back to seed. After that,
all four CRM specs are green together: **15 passed**. Worth a card of its
own: the drag journeys mutate seeded rows and the suite has no reset step.

**Also unchanged from intake:** `lib/crm/queries-drizzle.ts`, the three list
pages, `queries.ts`, and every other `lib/` file are untouched;
`git diff --name-only origin/main` lists exactly the 8 files in this card's
`## Scope paths`. `e2e/crm.spec.ts` is untouched.
