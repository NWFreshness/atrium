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
features/phase-11-crm-integrity/11.8-deal-filters.md
features/INDEX.md
CURRENT_FEATURE.md
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

The full criteria are in `features/phase-11-crm-integrity/11.8-deal-filters.md`
§"Acceptance criteria". The card defends every item.

1. `ListDealsOpts` gains `stage?: DealStage`, `closeAfter?: Date`,
   `closeBefore?: Date`. Both stores implement the new branches. **No
   parallel `listDealsBy*` helper.**
2. `lib/crm/deal-params.ts` is a pure module: parses `?stage=`,
   `?closeAfter=`, `?closeBefore=`. An unknown `stage` value is ignored
   (returns `undefined`), not 500. **The current `?status=` parse on
   `app/(authenticated)/crm/contacts/page.tsx:8-19` is the in-repo
   precedent** for the `parseStatus` shape.
3. `app/(authenticated)/crm/deals/page.tsx` renders three new GET-form fields
   matching how `/crm/contacts` does its `status` select — one `<select>` for
   stage, two `<input type="date">` for the close window.
4. Filters compose with `?q=`. The two-argument callers of `listDeals` still
   typecheck (memory + Drizzle paths agree).
5. **Empty-state copy is honest on all three list pages.** `/crm/deals?q=zzz`
   reads "No matching deals" rather than "No deals"; same for orgs and
   contacts when filters narrow the list. The same gate that catches the
   fix is the gate that catches the lie — a test names the exact strings.
6. **Default (unfiltered) order is unchanged.** No `ORDER BY` added. Third
   click in 11.4's sort returns to whatever the list action returned.
7. The browser gate (in 11.2's `e2e/crm-deals.spec.ts`) covers at least:
   - each filter narrows the table and survives a reload through the URL;
   - filters compose with `?q=`;
   - an unknown `?stage=foo` is ignored, not 500;
   - the empty-state copy is the "No matching deals" form, not "No deals".
8. **Injection-proven, both probes reverted byte-identically:**
   - removing the stage filter from the Drizzle module leaves the
     `?stage=Negotiation` journey green (a vacuous green is the failure mode);
   - removing the parser's `unknown → undefined` branch makes a hand-rolled
     `?stage=foo` 500 the page.

## Verify command

Per the spec.

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