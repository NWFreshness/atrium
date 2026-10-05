# JOB-008 — Edit from detail pages (11.5)

## Goal

Each CRM detail page (`/crm/organizations/[id]`, `/crm/contacts/[id]`,
`/crm/deals/[id]`) renders a single `Edit {name}` control in the page-title
row. Clicking it opens the **existing** form component as a dialog — already
proven on the list pages — so a user can correct a record without navigating
back to the list. The `<dl>` itself needs no change. The deal detail page
gains the tenant's full organization and contact lists so the form's selects
match the record. All three dialogs gain Escape-to-close, focus-on-open, and
focus restore on close. Closes **G2**.

## Scope paths

```
components/crm/detail-edit.tsx                      # new — DetailEdit wrapper, render-prop child, focus restore
components/crm/detail-edit.test.ts                  # new — source gate
components/crm/org-form.tsx                         # Escape + focus + useId() title
components/crm/contact-form.tsx                     # same three changes
components/crm/deal-form.tsx                        # same three changes; do NOT touch the numeric validation block (that's JOB-002's)
components/crm/org.module.css                       # .crm-detail-title, .crm-detail-action (crm- prefixed)
app/(authenticated)/crm/organizations/[id]/page.tsx  # wrapper + DetailEdit + OrgForm child
app/(authenticated)/crm/contacts/[id]/page.tsx       # wrapper + DetailEdit + ContactForm child
app/(authenticated)/crm/deals/[id]/page.tsx          # wrapper + DetailEdit + DealForm child, **plus** listOrganizationsAction + listContactsAction
components/crm/crm-pnw.test.ts                      # one new describe("detail pages carry one Edit control")
e2e/crm-deals.spec.ts                               # appended; file owned by JOB-002
```

Branch convention: ship on `feat/11.5-edit-from-detail-pages`. Never commit
or push to `main`. Never merge unless the user asks.

## Out of scope

- **No new route.** No `/crm/{records}/[id]/edit`. The three `[id]` routes are
  unchanged in path and shape.
- **No Add affordance on a detail page.** No `AddOrganizationButton` /
  `AddContactButton` / `AddDealButton` on any `[id]` page. The activity
  form's submit stays `Add activity` (`activity-form.tsx:107-109`) and stays
  on the contact and deal detail pages — it adds an activity *to* this
  record, a different verb on a different object. **11.3 owns that form's
  dialog mode; this card does not touch it.**
- **A Delete control on a detail page.** Every record's delete lives on its
  list row today. Moving it is 11.7's decision.
- **Inline editing.** No contentEditable, no per-field edit, no autosave.
- **A focus trap.** Out of scope; dialogs are four to seven fields.
- **Reordering, resizing, or restructuring the `<dl>`.** Lists keep their
  `dt`/`dd` pairs and their order.
- **`Probability` `%` suffix** on the deal detail `<dd>` at
  `deals/[id]/page.tsx:43`. JOB-002 owns that one-token change.
- **Value/probability field errors** in `deal-form.tsx:89-93`. JOB-002 owns
  those; the silent `return` they replace is inherited as-is.
- **The three table files.** `org-table.tsx`, `contact-table.tsx`,
  `deal-table.tsx` are byte-unchanged by this card. **AC10 enforces that.**
- **Deal filters, delete-consequence copy, the email unique index, QuickFind,
  `/crm/tasks`.** 11.8, 11.7, 11.6, 11.10, 11.9.

## Acceptance criteria


Numbered criteria below are the contract for this job. They were lifted from the retired phase-11 spec when that board was removed.

1. All three `[id]` pages render exactly one `DetailEdit`, inside a
   `styles["crm-detail-title"]` wrapper that also contains the existing
   `<div className="atrium-pagetitle">` with its `<h1>` and
   `<p className="atrium-sub">` **unchanged**. A read of the three files confirms
2. The Edit control's accessible name is `Edit {name}` — the same template literal as
   the list row (`org-table.tsx:54`). `components/crm/detail-edit.test.ts` asserts
   `aria-label={\`Edit ${` is present and that the visible label is the word `Edit`
3. Clicking Edit opens the **existing** form component, unchanged in its own logic,
   as `role="dialog" aria-modal="true"`. `getByRole("dialog", { name: \`Edit ${name}\` })`
   resolves to exactly one element on the detail page
4. The three `[id]` pages contain **no** `AddOrganizationButton`,
   `AddContactButton`, or `AddDealButton` — asserted by the new
   `crm-pnw.test.ts` block. The activity form's `Add activity` submit **is** still on the
   contact and deal detail pages, unchanged
5. All three forms handle `Escape` on the dialog element: open, `Escape`, dialog
   hidden, and focus is on the control that opened it. Asserted for the detail page in
   Journey O and for the list page by the same code path
6. Opening a dialog focuses that form's `Name` input
   (`org-form.tsx:79-81`, `contact-form.tsx:88-90`, `deal-form.tsx:128-141`).
   **Loading a detail page does not steal focus** — the `wasOpen` guard in `DetailEdit`
   is what makes this true, and a Playwright assertion that the page's `<h1>` is not
   focused after navigation is the test
7. A saved edit is visible in the `<dl>` **after a `page.reload()`**, for
   `deal.value`, `organization.industry`, and `contact.jobTitle` — one field per record
   type, asserted from the server-rendered `<dd>`, not from the form
8. The deal detail page calls `listOrganizationsAction()` and `listContactsAction()`,
   and the `<dd>` links resolve the organization and contact **from those lists** — the
   two `get*Action` calls are no longer made by that page. A read of
   `"app/(authenticated)/crm/deals/[id]/page.tsx"` shows two fetches, not four
9. A deal whose `organizationId` is `null` shows `None` in the form's Organization
   select and no link in the `<dd>` — the `onDelete: "set null"` shape
   (`lib/crm/schema.ts:72-76`), unchanged
10. **`components/crm/org-table.tsx`, `contact-table.tsx`, and `deal-table.tsx` are
    byte-unchanged by this feature.** `git diff --stat` over the three files is empty.
    This is a deliberate consequence of §4.3 and it is the criterion that catches a
    well-meaning implementer adding a `ref` to the action cell
11. `components/crm/org.module.css` adds `.crm-detail-title` and `.crm-detail-action`
    and **no `display: none`** — `crm-pnw.test.ts:221` asserts
    `expect(orgCss).not.toMatch(/display:\s*none/)` across the whole stylesheet.
    `.crm-detail-action` carries `outline: 2px solid var(--brass)` on `:focus-visible`
    (`:201-209` greps for it) and does **not** carry `opacity: 0`
12. The existing gates are green **unchanged**: `crm-pnw.test.ts:213-218` (44px rows,
    `--text-label` / `--ink-faint` on `th`, `tabular-nums` on `td`), `:220-227` (the
    opacity reveal), `:229-235` (the three `aria-label={\`Edit ${` template literals in
    `TABLE_COMPONENTS`), and `components/crm/crm-pass.test.ts`. No existing assertion in
    `crm-pnw.test.ts` is edited, and `PAGES` at `:26-32` is **not** extended to the `[id]`
    pages
13. Two journeys are appended to `e2e/crm-deals.spec.ts`. **If 11.2 has not landed that
    file does not exist and this criterion is recorded as unmet with a note in the shipped
    history** — it is not met by creating a fourth CRM spec file. The journeys cover:
    save → reload → `<dd>` reflects it (three record types, one field each); Escape
    closes and focus returns; the autofocus lands on `Name`; the page-load focus is not
    stolen; and no Add affordance is present
14. Every `getByRole` name derived from a `Date.now()` fixture is passed with
    `exact: true`; the dialog locator is scoped by `role="dialog"`, never by `body`; no
    journey asserts an exact row count; and `afterEach` deletes what the test minted and
    asserts its own name is gone
15. `lib/client-boundary.test.ts` stays green, and a read of
    `components/crm/detail-edit.tsx` shows it imports only `react` and
    `./org.module.css` — no `@/lib/…` import of any kind, so the boundary walk has nothing
    new to resolve
16. `tests/workroom-namespace.test.ts` stays green. `.crm-detail-title` and
    `.crm-detail-action` are defined in `components/crm/org.module.css` and imported only
    from `components/crm/` and `"app/(authenticated)/crm/"`. **The new
    `<div className="crm-detail-title">` wrapper must not define or restate any
    `.atrium-*` rule** — `:201-211` fails a per-app module that redeclares a shared class
    name, and the wrapper's job is layout only
17. `AUTH_SECRET=ci-build-placeholder npm run build` exit 0 **before** `env -u
    DATABASE_URL npm test`. `next build` is the only thing that typechecks the
    `children: (onClose: () => void) => ReactNode` render-prop contract and the
    `import type { ReactNode }` / `ReactKeyboardEvent` imports
18. `npm run format` was run with **explicit file paths** for the files this feature
    touched. Do not reformat unrelated files.

## Verify command

Run from the repo root.

```
AUTH_SECRET=ci-build-placeholder npm run build \
  && env -u DATABASE_URL npm test \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-deals.spec.ts e2e/crm.spec.ts
```

Build before test. `e2e/crm-deals.spec.ts` exists after JOB-002 lands.

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** The three read-only detail pages are at
`app/(authenticated)/crm/organizations/[id]/page.tsx:30-37`,
`contacts/[id]/page.tsx:36-58`, `deals/[id]/page.tsx:37-72`. The forms
already accept `onClose` — `org-form.tsx:24-30`, `contact-form.tsx:27-35`,
`deal-form.tsx:64-74`. The list-row `aria-label={`Edit ${`}` template is at
`org-table.tsx:54`, `contact-table.tsx:77`, `deal-table.tsx:108`.

**Calendar.** Sits behind `feat-001` (11.1). **Cannot run in parallel with
11.4.** The serial rule is the design's call; this card places the focus
restore in a new `detail-edit.tsx`, so 11.5 touches **none** of the three
tables (AC10 asserts the diff is empty) — but the e2e journey is the third
file Playwright loads after 11.4's, so they cannot share one dev server.

**The focus-restore design fix is the load-bearing decision in this card.**
The design's "11.4/11.5 both rewrite header and action regions" claim was
half right. The header overlap is real (11.4); the action overlap is not
(this card). `DetailEdit` owning its own `triggerRef` is the same
user-visible behaviour for zero edits to the three table files. If a reviewer
asks for the trigger ref inside the table instead, the cost is three `columns`
dependency arrays that must be exactly right.

**Recorded limits, carried from the spec:** the two wider fetches on the deal
detail page are not tenant-scoped in a new way (the change is a wider fetch,
not a wider scope) but the cost is real on a large tenant; no Delete on a
detail page; no focus trap; screen-reader quality is unproven; the autofocus
change on the *list* pages is unproven beyond the two existing journeys;
`crm-pnw.test.ts` still does not assert `atrium-pagetitle` on the three `[id]`
pages (PAGES at `:26-32` is the five section pages); `/crm/tasks` not
previewed; Probability bare number on `deals/[id]/page.tsx:43` is JOB-002's;
CI does not prove this feature; vitest does not typecheck; the three forms'
dialogs gain no new class.

**Carried from session 1 (`progress.md`):** the **3 orphaned activities per
`crm-activities.spec.ts` run** defect moves to JOB-007 (11.3), not this card.
JOB-002's deals e2e mints and cleans up its own rows; this card's edit
journeys do the same.
