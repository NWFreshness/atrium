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
features/phase-11-crm-integrity/11.4-table-column-sorting.md
features/INDEX.md
CURRENT_FEATURE.md
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

The full criteria are in `features/phase-11-crm-integrity/11.4-table-column-sorting.md`
§"Acceptance criteria" (10 items). The card defends every one.

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

Per the spec §"Verification". Build before Playwright.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-deals.spec.ts
```

`e2e/crm-deals.spec.ts` must exist (JOB-002 creates it). If JOB-002 has not
landed yet, this card cannot ship — record the journey unmet and do not
invent a fourth spec file.

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** `package.json:23` is
`@tanstack/react-table@^9.2.4`. `org-table.tsx:16`, `contact-table.tsx:16`,
`deal-table.tsx:17` are the empty `tableFeatures({})` calls. The `<th>`
blocks are `org-table.tsx:93-105`, `contact-table.tsx:116-128`,
`deal-table.tsx:147-159`. The name-lookup pattern is at `contact-table.tsx:58-67`
and `deal-table.tsx:79-98`. All read from the working tree.

**Calendar.** Sits behind `feat-001` (11.1). 11.4 is the first feature on the
long pole after 11.1; it ships before 11.5 (Edit from detail) and before 11.3
(Activity correct-and-complete, which adds a `Last contacted` column to
`contact-table.tsx`).

**Files this card shares with 11.3.** `contact-table.tsx` is the only table
file both 11.4 and 11.3 modify. 11.3's spec is explicit: its `Last contacted`
column ships as a `display` column with no `accessorFn`, **unsortable**. 11.4
makes it sortable in its own per-column pass, if 11.4 lands first. The board
rule (one `in_progress` at a time) is the only thing keeping these two
features honest.

**The v8 fossils trap.** The ideas doc's A3 sentence (`useState<SortingState>`
+ `getSortedRowModel`) is v8 and does not exist in `@tanstack/react-table@9.2.4`.
The correct surface is `rowSortingFeature` + `createSortedHeader
gestures()`. An implementer copy-pasting the ideas doc ships a fossil. The
spec names the v9 mapping in §2 of `## Spec`; do not paste v8.

**Recorded limits, carried from the spec:** sort does not survive reload; no
`?sort=`; no `ORDER BY`; no Last-contacted column to sort (this card); no
multi-sort; pipeline is not a table; lists stay unbounded; screen-reader quality is
unproven.