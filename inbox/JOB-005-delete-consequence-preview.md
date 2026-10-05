# JOB-005 — Preview what a delete will unlink (11.7)

## Goal

The `Delete {name}` confirm on all three CRM tables names the count of rows
that will be unlinked when a user deletes an organization, contact, or deal —
exactly the sentence the spec dictates, byte-identical to today's string when
the counts are all zero. The `SET NULL` schema is unchanged. Closes **G11**.

## Scope paths

```
lib/crm/cascade-preview.ts                          # new — pure, type-only import of CascadePreview
lib/crm/cascade-preview.test.ts                     # new — six worked examples + pluralize + forbidden tokens
lib/crm/queries-shared.ts                           # CascadePreview type + previewFor… row-kind
lib/crm/queries.ts                                  # three dispatchers; requireTenantId first; no db.*
lib/crm/queries-memory.ts                           # three count…InMemory
lib/crm/queries-drizzle.ts                         # three count…InDrizzle using count() from drizzle-orm
lib/crm/org-actions.ts                              # *CascadePreviewForSession + *CascadePreviewAction
lib/crm/contact-actions.ts
lib/crm/deal-actions.ts                             # 11.8 also edits deal-actions.ts; serial, not parallel
components/crm/org-table.tsx                        # Delete click handler
components/crm/contact-table.tsx
components/crm/deal-table.tsx
lib/crm/queries.test.ts                             # new describe("cascadePreview")
lib/crm/org-actions.test.ts, contact-actions.test.ts, deal-actions.test.ts  # one tenant-scoping case each
e2e/crm-delete-preview.spec.ts                      # new — one journey, three branches (zero, two-noun, cancel)
features/phase-11-crm-integrity/11.7-delete-consequence-preview.md
features/INDEX.md
CURRENT_FEATURE.md
```

Branch convention: ship on `feat/11.7-delete-consequence-preview`. Never
commit or push to `main`. Never merge unless the user asks.

## Out of scope

- **"Detach instead."** Cut by the design and the PM.
- **A bespoke confirm dialog.** Phase non-goals; the existing `confirm()` is
  the guard before an unrecoverable delete.
- **Activity delete.** 11.3 owns it; its confirm is `Delete this activity?`
  with no consequence line, because an activity has no downstream rows.
- **A `count()` extraction to `lib/input/numbers.ts`.** Not numeric input.
- **Soft deletes, recycle bin, undo toast.** Phase non-goals.
- **Any change to `onDelete`.** It stays `"set null"` across all five FKs.
- **Editing `lib/crm/schema.ts`.**
- **A new migration.** No schema change.
- **Adding `display: none` rules** to `.crm-row-actions button` to style the
  pending state — the 10.3 gate reads that block by selector.
- **Running in parallel with 11.8.** Both touch `lib/crm/deal-actions.ts`.

## Acceptance criteria

The full criteria are in `features/phase-11-crm-integrity/11.7-delete-consequence-preview.md`
§"Acceptance criteria" (24 items). The card defends every item.

1. `lib/crm/queries-shared.ts` exports `CascadePreview` with exactly the three
   keys `contacts`, `deals`, `activities`, all required, typed `number`.
2. `lib/crm/queries.ts` has three dispatchers —
   `organizationCascadePreview`, `contactCascadePreview`,
   `dealCascadePreview` — each calling `requireTenantId(tenantId)` first,
   each taking `(tenantId, id, repo?)` in that order, each dispatching to
   the memory or Drizzle store with **no `db.*`** in the barrel.
3. `lib/crm/queries-memory.ts` and `lib/crm/queries-drizzle.ts` each have
   three implementations.
4. Every count is filtered on `tenantId` **and** the foreign key. The
   `lib/crm/queries.test.ts` "tenant-B rows exist" assertion proves this.
5. `organizationCascadePreview(tenantA, "missing", memory)` returns
   `{ contacts: 0, deals: 0, activities: 0 }` (not a throw).
6. The three new helpers are added to the existing blank-`tenantId` loop at
   `lib/crm/queries.test.ts:65-137`, each with `rejects.toThrow(/tenantId/)`.
7. `lib/crm/cascade-preview.ts` imports **nothing** but
   `import type { CascadePreview } from "./queries-shared"`. The
   `lib/client-boundary.test.ts` transitive check is the gate.
8. `lib/crm/cascade-preview.test.ts` asserts all six worked examples with
   `toBe(exactString)`. The zero case is the literal
   `"Delete Acme?"` — byte-identical to `org-table.tsx:63`.
9. The pluralize table is asserted for `contact`, `deal`, `activity`.
10. The message matches neither `/cascade/i` nor `/orphan/i`.
11. Each `lib/crm/{org,contact,deal}-actions.ts` gains a
    `*CascadePreviewForSession` calling `requireTenant(getSession)` with **no**
    second argument, and a `*CascadePreviewAction` using the same three-line
    `const { auth } = await import("@/auth")` shape as its neighbours.
12. The three `*ForSession` signatures take `(getSession, id, repo?)` —
    no input object, so no `ClientTenantInput` and no way for a client to
    supply a `tenantId`.
13. All three tables call `consequenceMessage(row.name, preview)` inside
    `confirm()`. The `aria-label={`Delete ${`}` template is unchanged.
15. All three tables gained one `useState<string | null>(null)` pending id,
    keyed by row id, with `finally { setPendingDelete(null) }` on the **cancel**
    path too — verified by the journey's cancel assertion.
17. `lib/crm/schema.ts` is unmodified. All five `onDelete: "set null"` FKs at
    `:52, :73, :76, :101, :103` are intact. `lib/crm/queries.test.ts:1051-1085`
    passes unmodified.
18. `e2e/crm-delete-preview.spec.ts` exists with one test asserting, in order:
    the two-noun message on a minted organization with one linked deal is
    **exactly** `` `Delete ${orgName}?\nThis will unlink 1 deal.` ``; the
    zero-count message is **exactly** `` `Delete ${orgName}?` ``; a `dismiss()`
    on `confirm()` leaves the row present after a `page.reload()`.
19. The journey mints every row with a `Date.now()` suffix and **deletes no
    seeded row** — the seed names `Northwind Logistics`, `Bluepeak Software`,
    `Harbor & Lane` are asserted by `e2e/crm.spec.ts:62-64` and 11.1's
    Journey A.
20. Every `page.once("dialog", …)` is registered **before** the click that
    opens `confirm()`; every role name derived from a fixture is
    `{ exact: true }`; every post-navigation assertion carries
    `{ timeout: NAV_TIMEOUT }`.
22. **Injection-proven, three probes reverted byte-identically:**
    1. hard-coding `return { contacts: 0, deals: 0, activities: 0 }` at the
       top of `organizationCascadePreviewInMemory` fails both unit and e2e;
    2. changing the zero branch of `consequenceMessage` to append
       `"\nThis will unlink nothing."` fails the exact-string assertion;
    3. calling `deleteOrganizationAction(org.id)` without `confirm()` fails the
       cancel and zero-count assertions.

## Verify command

Per the spec.

```
AUTH_SECRET=ci-build-placeholder npm run build \
  && env -u DATABASE_URL npm test \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-delete-preview.spec.ts e2e/crm.spec.ts
```

Build before test (`vitest` does not typecheck; `next build` typechecks `e2e/`).

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** `lib/crm/schema.ts:52` is
`contacts.organizationId` → `organizations.id`; `:73` is
`deals.organizationId` → `organizations.id`; `:76` is `deals.contactId` →
`contacts.id`; `:101` is `activities.contactId` → `contacts.id`; `:103` is
`activities.dealId` → `deals.id`. Five `onDelete: "set null"` FKs across three
parent types — the ideas doc's G11 line says three, the spec corrects to five.
`components/crm/org-table.tsx:63`, `contact-table.tsx:86`, `deal-table.tsx:117`
are the three `confirm(\`Delete ${name}?\`)` calls that must stay
byte-identical on the zero-count branch.

**Calendar.** Sits behind `feat-001` (11.1). **Cannot run in parallel with
11.8** — both touch `lib/crm/deal-actions.ts`. 11.8 edits `:61-65` (the
`listDealsForSession` re-projection); 11.7 appends at the bottom. Serial.

**Recorded limits, carried from the spec:** the Drizzle `count()` fragments
are unexecuted in CI; the three-noun message is unreachable through the UI
(structurally — no `activities.organizationId`); the destructive control is
disabled for one round trip; the preview is a point-in-time count with no
transaction; counts are counted, not named; `SET NULL` orphans are still
created (this warns, does not prevent); no undo and no toast; copy quality is
not proven by tests; native `confirm()`'s screen-reader behaviour is the
browser's, not the app's.