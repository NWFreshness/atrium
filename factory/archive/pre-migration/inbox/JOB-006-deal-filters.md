# JOB-006 — Deal filters (11.8)

## Goal

`/crm/deals` filters by **stage**, a **close-date window**, and the existing
`q`, surviving a reload through the URL. `ListDealsOpts` gains `stage?`,
`closeAfter?`, `closeBefore?`. A client-safe parser module validates the
params, and the same empty-state lie ("No deals" for both empty and
filtered-empty) is fixed on all three list pages. Closes **G4**.

## Scope paths

```
lib/crm/queries-shared.ts                           # ListDealsOpts gains stage?, closeAfter?, closeBefore?
lib/crm/queries.ts                                  # dispatch unchanged; opts passes through
lib/crm/queries-memory.ts                           # new branch for stage + close date
lib/crm/queries-drizzle.ts                          # new branch for stage + close date
lib/crm/deal-params.ts                              # new — client-safe parser: parseStage, parseCloseDate, closeBeforeExclusive
lib/crm/deal-params.test.ts                         # new — stage enum membership; date parse; unknown stages return undefined
lib/crm/deal-actions.ts                             # listDealsForSession opts pass-through at :61-65
app/(authenticated)/crm/deals/page.tsx             # parses stage + close window from searchParams, passes opts
app/(authenticated)/crm/organizations/page.tsx     # empty-state copy fix
app/(authenticated)/crm/contacts/page.tsx          # empty-state copy fix
app/(authenticated)/crm/deals/page.tsx              # empty-state copy fix
components/crm/deal-table.tsx                       # empty-state receives query context (e.g. "No matching deals for Negotiation in 2026 Q3")
components/crm/org-table.tsx                        # empty-state copy fix
components/crm/contact-table.tsx                    # empty-state copy fix
lib/crm/queries.test.ts                             # rejection / acceptance of opts; STAGE_PROBABILITY unchanged
e2e/crm-deals.spec.ts                               # appended; file owned by JOB-002
```

Branch convention: ship on `feat/11.8-deal-filters`. Never commit or push to
`main`. Never merge unless the user asks.

## Out of scope

- **Filtering contacts by status, organization, or last-contacted window.**
  11.8's scope is deals only. The existing contacts `?status=` filter stays
  as it is.
- **Filtering activities.** Activities have no list page.
- **Server-side sorting.** 11.4 owns sorting; it composes client-side after
  the server returns the filtered rows.
- **Pipeline board filtering.** Deferred; the spec excludes G5 from Phase 11.
- **Editing `lib/crm/queries-shared.ts`'s `ListActivitiesOpts`** or any other
  list opts besides deals.
- **Editing `lib/crm/dashboard.ts`**. Dashboard aggregations stay full-table.
- **Adding `LIMIT` to any list helper.** B5 is a phase non-goal.
- **Running in parallel with 11.7.** Both touch `lib/crm/deal-actions.ts`.

## Acceptance criteria


Numbered criteria below are the contract for this job. They were lifted from the retired phase-11 spec when that board was removed.

1. `lib/crm/queries-shared.ts` — `ListDealsOpts` has `stage?: DealStage`,
    `closeAfter?: Date`, `closeBefore?: Date` after `contactId`, and **no new
    import** was added (the file already imports `DealStage` at `:6`)
2. All six two-argument `listDeals` / `listDealsAction` call sites are
    unmodified and typecheck: `lib/crm/dashboard.ts:260`,
    `lib/crm/move-deal.ts:29`, `app/(authenticated)/crm/pipeline/page.tsx:5`,
    and the three test files. This is proven by
    `AUTH_SECRET=ci-build-placeholder npm run build` exit 0
3. `lib/crm/deal-params.ts` exports `parseStage`, `parseCloseDate` and
    `closeBeforeExclusive`; it imports only from `./constants`, and
    `lib/deal-params.test.ts`'s source-grep asserts the file contains no
    `queries`, `schema`, `lib/db` or `drizzle-orm`
4. `lib/crm/deal-params.test.ts` — `parseCloseDate("2026-09-30")` returns a
    `Date` whose `toISOString()` is exactly `"2026-09-30T00:00:00.000Z"`, and the
    file carries a comment naming the missing-`Z` local-time failure
5. `lib/crm/deal-params.test.ts` — `parseCloseDate("2026-02-31")` is
    `undefined` (round-trip), `parseCloseDate("2026-2-3")` is `undefined`
    (shape), `parseStage("Bogus")` is `undefined` (membership), and
    `closeBeforeExclusive("2026-12-31")` is `"2027-01-01T00:00:00.000Z"`
6. `lib/crm/queries-memory.ts` — `listDealsInMemory`'s predicate includes
    the stage equality and both window comparisons with an explicit
    `closeDate !== null` guard, and the existing tenant / search / id conditions
    are unmodified
7. `lib/crm/queries-drizzle.ts` — `listDealsInDrizzle`'s `filters` array
    gains `eq(deals.stage, …)`, `gte(deals.closeDate, …)` and
    `lt(deals.closeDate, …)`, each behind an `!== undefined` spread; the
    no-`q` vs `q`-join branch structure at `:273-293` is byte-identical, and
    `gte` and `lt` are added to the `drizzle-orm` import at `:1`
8. `lib/crm/deal-params.test.ts` and `lib/crm/queries.test.ts` pin the
    **half-open** bound: a deal at exactly `closeAfter` is included, a deal at
    exactly `closeBefore` is **excluded**, and a deal at `closeBefore - 1ms` is
    included — each asserted by `id`, not by index
9. `lib/crm/queries.test.ts` — a deal with a NULL `closeDate` is excluded by
    an active `closeAfter`, by an active `closeBefore`, and by both; and it is
    still returned when no window is given (the existing test at `:484-512` is
    unmodified and green)
10. `lib/crm/queries.test.ts` — an inverted window
    (`closeAfter: sep30, closeBefore: sep1`) returns `[]`, and a case combining
    all five filters returns exactly one row
11. `lib/crm/deal-actions.ts:61-65` — the re-projection literal lists `q`,
    `organizationId`, `contactId`, `stage`, `closeAfter`, `closeBefore` in that
    order. **It is a literal, not a spread of `input`.** `ClientTenantInput`
    (`:21-23`) is unchanged
12. `lib/crm/deal-actions.test.ts` — a new case asserts
    `listDealsForSession(getSessionA, { stage: "Qualified" }, memory)` returns
    only the `Qualified` deal and
    `listDealsForSession(getSessionA, { closeAfter, closeBefore }, memory)`
    returns only the in-window deal, with a comment naming
    `lib/crm/deal-actions.ts:61-65` as the thing under test
13. `lib/crm/deal-actions.test.ts` — the existing case at `:120-133` still
    passes with `{ q, tenantId: tenantB }`, proving the re-projection cannot be
    widened into a tenant override; `rejects.toThrow("Unauthenticated")` at
    `:281-290` unmodified
14. `app/(authenticated)/crm/deals/page.tsx` — the form has five fields with
    `name` / `id` exactly as §6's table, plus the unchanged `Search` submit;
    the five `id`s collide with none of the seven in
    `components/crm/deal-form.tsx:129,144,161,183,201,216,237`
15. `app/(authenticated)/crm/deals/page.tsx` — every control is
    uncontrolled with `defaultValue`; there is no `useState`, no `onChange`, and
    no client component in the file
16. `app/(authenticated)/crm/deals/page.tsx` — `Organization` is validated
    against the fetched `organizations` before it reaches `listDealsAction`, so
    a stale or foreign id renders the unfiltered table with `All` selected, not
    an empty one
17. `/crm/deals?stage=Bogus` returns 200, renders the unfiltered table with
    `All` selected, and renders **no** summary line
18. The summary line renders only when a filter is active, inside
    `.crm-toolbar`, in the order `q` → `stage` → window → organization, joined
    with `, `, with a single `· Clear filters` suffix; the four single-filter
    strings and the composed string are exactly the ones in §7's table
19. Dates in the summary are rendered by `formatDate`
    (`lib/crm/format.ts:8-18`) with its `timeZone: "UTC"`, and the test reads
    the rendered text rather than hand-typing a date
20. `Clear filters` is a `<Link href="/crm/deals">` with the exact accessible
    name `Clear filters`, and clicking it lands on `/crm/deals` with an empty
    query string
21. `components/crm/org.module.css` — `.crm-filter-summary` is `crm-`
    prefixed, sets no new token, contains no `display: none`
    (`components/crm/crm-pnw.test.ts:220-227`), and the module is otherwise
    unmodified
22. `deal-table.tsx`, `contact-table.tsx` and `org-table.tsx` each gain one
    optional `filtered?: boolean` prop defaulting to `false`; the three
    no-filter strings `No deals` / `No contacts` / `No organizations` are
    byte-identical to today's, and the three filtered strings are exactly
    `No deals match these filters.` / `No contacts match these filters.` /
    `No organizations match these filters.`
23. `/crm/contacts?q=zzz` renders `No contacts match these filters.` and
    `/crm/organizations?q=zzz` renders `No organizations match these
    filters.` — the pre-existing lie, fixed in the same PR
24. `e2e/crm-deal-filters.spec.ts` has three tests: stage + organization
    narrowing surviving a `page.reload()`; the date window with minted rows
    including the **last** day; and unknown-`stage` tolerance. The second test
    asserts the window's final day is visible, which an inclusive-`lte` bound
    would fail
25. The date-window test mints its own deals with close dates and does not
    rely on the seed — `lib/crm/seed.ts:107-173` writes no `closeDate`, and
    `lib/crm/seed.ts` is unmodified
26. Every mutating test mints `Date.now()`-suffixed names inside the test
    body; no `beforeAll` writes; **no exact row-count assertion**; `afterEach`
    re-reads the button list each pass and asserts each name is gone
27. Every `page.once("dialog", …)` is registered before the click that
    opens `confirm()`; every role name derived from a fixture is
    `{ exact: true }`; no CSS-module class selector; no `waitForTimeout`
28. `lib/client-boundary.test.ts`, `components/crm/crm-pnw.test.ts`,
    `components/crm/crm-pass.test.ts`, `tests/crm-shell.test.ts`,
    `tests/workroom-namespace.test.ts` and `tests/theme-contrast.test.ts` are
    green and unmodified
29. **Injection-proven.** Three probes, each reversed byte-identically,
    results recorded in the shipped notes:
    1. remove `stage: input.stage` from the literal at
       `lib/crm/deal-actions.ts:62-66` → `lib/crm/deal-actions.test.ts` fails
       on the `{ stage: "Qualified" }` case. **This is the probe that matters
       most** — the type still compiles with the field removed, which is why
       this bug ships silently
    2. change `lt(deals.closeDate, …)` to `lte(deals.closeDate, …)` in
       `queries-drizzle.ts` → the **unit** test at criterion 8 still passes
       (it runs the memory store) and the **e2e** date-window test fails on the
       last-day assertion. A unit-only suite cannot catch this; that is the
       recorded limit
    3. set `closeBefore: closeToDate` instead of
       `closeBeforeExclusive(closeTo)` in the page → the e2e date-window test
       fails on the last-day assertion
30. `env -u DATABASE_URL npm test` green;
    `AUTH_SECRET=ci-build-placeholder npm run build` exit 0 **before** the test
    command (`vitest` does not typecheck; `next build` typechecks `e2e/`); then
    `AUTH_SECRET=local-playwright-secret npx playwright test
    e2e/crm-deal-filters.spec.ts e2e/crm.spec.ts` green against the dev `.env`
    creds
31. The shipped notes record: what job `ci` ran (vitest against the memory
    repo, **no** Postgres, **no** Playwright), that the Drizzle `gte` / `lt`
    fragments are proven by the browser journey and a source read rather than
    by a unit test, and that 11.4's client-side sort is not covered by this
    feature and dies on reload

## Verify command

Run from the repo root.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-deals.spec.ts
```

`e2e/crm-deals.spec.ts` must exist (JOB-002 creates it).

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** `lib/crm/queries-shared.ts:73-77` is
`ListDealsOpts = { q?, organizationId?, contactId? }` — the existing fields
this card extends. `lib/crm/queries-memory.ts:215-217` and
`lib/crm/queries-drizzle.ts:266-272` already implement both id filters. The
contacts precedent is `app/(authenticated)/crm/contacts/page.tsx:8-19` (the
`parseStatus` shape) and `:44-62` (the GET form). The empty-state lie is at
`components/crm/deal-table.tsx:143` (verified; treat as approximate — re-read
at spec time).

**Calendar.** Sits behind `feat-001` (11.1). **Cannot run in parallel with
11.7** — both touch `lib/crm/deal-actions.ts`. 11.7 appends at the bottom;
11.8 edits the `listDealsForSession` re-projection at `:61-65`. Serial.

**The empty-state copy fix is broader than this card's title.** The same lie
exists on `/crm/organizations?q=zzz` and `/crm/contacts?q=zzz`. This card
fixes all three because leaving two of three saying one thing and the third
another is the drift this phase exists to stop. The spec is explicit.

**Recorded limits, carried from the spec:** server-side sorting still absent;
no `ORDER BY`; pipeline board filtering is out; bounded pagination is a
phase non-goal; the contact-filter surface stays as is; activity-filter
surface does not exist.
