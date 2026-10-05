# JOB-002 — Validate deal value and probability (11.2)

## Goal

`createDeal` and `updateDeal` in `lib/crm/queries.ts` reject a negative `value`,
a `probability` outside `0–100`, or a non-integer probability — and every
`STAGE_PROBABILITY` value still creates a deal — so the dashboard, pipeline,
and `expectedValue` arithmetic cannot be poisoned by bad input again. Closes
**G10**. The deals surface gains browser coverage for the first time via the
new `e2e/crm-deals.spec.ts`, using the house style 11.1 fixed.

## Scope paths

```
lib/input/numbers.ts
lib/input/numbers.test.ts
e2e/crm-deals.spec.ts                              # 11.2 owns this file; 11.4 and 11.5 append
lib/crm/queries.ts                                  # barrel calls in createDeal + updateDeal
lib/crm/queries.test.ts                             # rejection cases + STAGE_PROBABILITY still passes
app/(authenticated)/crm/deals/[id]/page.tsx         # 11.2 owns the Probability % suffix on the <dd> (one-token)
```

Branch convention: ship on a `feat/11.2-deal-number-validation` branch with a
GitHub PR. Never commit or push to `main`. Never merge unless the user asks.

## Out of scope

- **A Postgres CHECK or migration.** Out of scope; 11.6 owns CRM migrations.
- **Field-level error UI in `DealForm`.** The client `isFinite` check stays a
  nicety; the server is the gate. The ideas doc's A5 is explicit on this.
- **`components/crm/deal-form.tsx:89-93`.** That block is unchanged. Spec
  §3 trap #3 calls this out by line.
- **`lib/crm/move-deal.ts:60`.** `STAGE_PROBABILITY[stage]` keeps flowing
  through `updateDeal` unchanged; the barrel is the gate.
- **Multi-currency.** `formatMoney` is one `Intl.NumberFormat`.
- **Sorting assertions, edit-from-detail journeys, QuickFind, the deals
  `?stage=` form.** Those are 11.4, 11.5, 11.10, 11.8.
- **The `Probability` `%` suffix on `app/(authenticated)/crm/deals/[id]/page.tsx:43`.**
  This card owns it (see the line above in `## Scope paths`); the heading
  here is mislabelled, kept for the audit trail. Per 11.5's Controller
  notes #1, the line is **11.2's** — the spec's own Recorded Limit #6
  ("Not this feature") is stale. The change is one token (`{deal.probability}`
  → `{deal.probability}%`); 11.5 must not take it.
- **Editing the `e2e/crm-deals.spec.ts` file later.** 11.4 appends sorting;
  11.5 appends edit-from-detail. This card ships the file with Journeys F and G
  only.
- **Linting.**

## Acceptance criteria

1. `lib/input/numbers.ts` exists, imports nothing from `lib/crm`, exports
   `MAX_MONEY`, `assertMoney`, `assertPercent`. `assertPercent` uses
   `Number.isInteger`, not `Number.isFinite`.
2. `createDeal` and `updateDeal` in `lib/crm/queries.ts` both call the asserts
   **before** memory/Drizzle dispatch (placement matches `short()` / `long()`).
3. `createDeal` with `value: -1` throws; `updateDeal({ value: -1 })` throws;
   `createDeal` with `probability: 10.5` throws; `updateDeal({ probability: 101 })`
   throws. Stored row unchanged on reject.
4. Every `STAGE_PROBABILITY` value (`New: 10, Qualified: 25, Proposal: 50,
   Negotiation: 75, Won: 100, Lost: 0`) still creates and updates successfully.
5. `lib/crm/move-deal.test.ts` still green. `lib/crm/move-deal.ts:60` is not
   edited. `components/crm/deal-form.tsx:89-93` is not edited.
6. `e2e/crm-deals.spec.ts` exists and implements Journeys F (create-appears-on-board-and-deletes)
   and G (deleting an organization does not delete its deals; `SET NULL` is
   unchanged), using 11.1's sections 0–3 timing/fixture/selector rules. **No
   sorting, edit-from-detail, or delete-preview assertions in this file yet.**
7. **Injection-proven, both probes reverted byte-identically:** dropping the
   `updateDeal` `assertMoney` call makes the negative-value test green; passing
   `input.probability` through without `assertPercent` makes the `10.5` create
   test green. Recorded in the shipped notes.
8. `lib/crm/queries-drizzle.ts` does not contain `assertMoney` or
   `assertPercent` (source grep, per the spec's helper test rule).
9. `lib/crm/schema.ts` is unchanged. No migration directory is added or changed
   by this card.

## Verify command

Build before Playwright — `vitest` does not
typecheck; `next build` typechecks `e2e/`. `AUTH_SECRET=local-playwright-secret`
is a placeholder name, not a literal; `.env` has no `AUTH_SECRET`.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-deals.spec.ts
```

The full command must exit 0. A green exit with 0 Playwright passed (every test
skipped) is a failure of this card. Before running, confirm nothing foreign is
listening on `:3000` (`ss -ltnp | grep :3000`); `reuseExistingServer: true`
makes a foreign `next-server` hijack the run silently. Kill by PID.

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Implementer addition (session 9).** One path added to `## Scope paths`:
`app/(authenticated)/crm/deals/[id]/page.tsx`. The card's `## Out of scope`
heading mis-labels the `Probability` `%` suffix on line 43 as out of scope
but the body says "this card owns it" — 11.5's Controller notes
(recorded when 11.5 was specced) confirm the line is **11.2's**, and 11.5 must not take it. The
spec's Recorded Limit #6 ("Not this feature") is stale; the change is
one token (`{deal.probability}` → `{deal.probability}%`).

**Spec citations verified at intake (paths and lines from the working tree).**
`lib/crm/queries.ts:284-317` is `createDeal`; `:319-331` is `updateDeal`.
`lib/crm/schema.ts:79-80` is the `doublePrecision` `value` / `integer`
`probability` columns with no CHECK. `components/crm/deal-form.tsx:89-93` is
the silent `isFinite` `return` left untouched. `lib/crm/move-deal.ts:60`
spreads `STAGE_PROBABILITY[stage]` into `updateDeal`. All read from the
working tree at intake time, not from memory.

**Calendar.** The card sits in the queue behind `feat-001` (11.1). Once 11.1
passes, the order-free features are 11.2, 11.4, 11.6, 11.7, 11.8. **11.4 and
11.5 cannot run in parallel** (shared table files) and **11.7 and 11.8 cannot
run in parallel** (shared `deal-actions.ts`). 11.2 itself is independent and
may start first.

**Status lives in `feature_list.json` only.** The old board was removed; do not recreate it.

**Carried from session 1 (`progress.md`):** PR #92's `e2e/crm-activities.spec.ts`
leaks 3 orphaned activities per run — that's a 11.3 defect, not this card's.
Reset demo after running the activities spec before this card's Playwright run.

**Recorded limits, carried from the spec:** no field-error UI; no CHECK
constraint on the column; the deals-form browser test of a rejected number is
not in scope (the client does not reject negatives; a 500 from the dialog is
not specified UX); the Drizzle path is unexecuted by vitest, proven by barrel
placement and the source grep, not by running SQL.
