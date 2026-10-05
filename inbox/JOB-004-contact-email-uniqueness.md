# JOB-004 — Contact email uniqueness and duplicate pre-check (11.6)

## Goal

Two contacts in one tenant cannot hold the same email in any casing. A
case-variant duplicate is refused with a message that names the existing
contact and links to it. A `null` email is unaffected. Closes **G9**. The
CRM mirror of 8.1's `users_email_lower_idx`.

## Scope paths

```
lib/crm/schema.ts                                   # contacts gains uniqueIndex("contacts_email_lower_idx").on(table.tenantId, sql`lower(${table.email})`)
drizzle/0008_*.sql                                  # hand-edited, IF NOT EXISTS, named per migration meta
lib/crm/queries.ts                                  # createContact + updateContact: duplicate pre-check + 23505 mapping
lib/crm/queries-memory.ts                           # case-insensitive lookup helper
lib/crm/queries-drizzle.ts                          # case-insensitive lookup helper
lib/crm/contact-actions.ts                          # createContactAction maps 23505 to a typed code; copy says no other tenant
lib/crm/contact-form.tsx                            # duplicate-error slot
lib/crm/queries.test.ts                             # case-variant rejected; null email unaffected; tenant bucket grows
lib/crm/contact-actions.test.ts                     # tenant-scoping, the typed 23505 code
lib/db/seed.ts                                      # upsert pattern mirrors 8.1's update (case-insensitive lookup; do NOT use onConflictDoUpdate on table.email)
```

Branch convention: ship on `feat/11.6-contact-email-uniqueness`. Never commit
or push to `main`. Never merge unless the user asks.

## Out of scope

- **Soft deletes / recycle bin / a duplicates page.** Phase non-goals.
- **Global unique on `contacts.email`.** The index is **tenant-composite**
  per the design's ruling — a global one refuses tenant B's Ana because tenant
  A already has her. Proven 23505 on PG 16.15.
- **Renaming `users_email_unique` for the contacts table.** Different table,
  different name.
- **Editing `lib/db/seed.ts`** beyond the upsert pattern that the new index
  forces. The seeded contacts stay.
- **Editing `lib/auth/signup.ts`.** That file is 8.1's, with its own
  `lower(email)` lookup; out of scope.
- **Any change to `lib/crm/format.ts`.**

## Acceptance criteria


Numbered criteria below are the contract for this job. They were lifted from the retired phase-11 spec when that board was removed.

1. `lib/crm/schema.ts` declares
   `uniqueIndex("contacts_email_lower_idx").on(table.tenantId, sql\`lower(${table.email})\`)`,
   and `contacts.email` is still a bare nullable `text("email")` at `:48` with
   `isUnique === false`
2. `lib/db/schema.test.ts` — the `contacts lower(email) unique index` block
   asserts the name, `method === "btree"`, and the rendered column list
   `["tenantId", 'lower("contacts"."email")']` — **in that order**
3. `lib/db/schema.test.ts` — the `tenantId indexes` gate at `:104-129` is
   narrowed to single-column `tenantId` indexes and still asserts one per
   table, named `<table>_tenantId_idx`; a reader running the suite *before* this
   edit sees `expected [ 'contacts_tenantId_idx', 'contacts_email_lower_idx' ]
   to have a length of 1 but got 2`, and that failure is recorded here
4. `lib/db/schema.test.ts` — the `0008` migration block reads the **real**
   generated filename, asserts exactly one statement, matches it byte-for-byte
   as written in the committed file, and asserts the source contains no
   `DROP TABLE|DROP TYPE|ALTER TYPE|ALTER TABLE|CREATE POLICY|ROW LEVEL
   SECURITY|DELETE FROM|TRUNCATE`
5. `drizzle/0008_*.sql` carries `IF NOT EXISTS`, carries the
   name-not-definition caveat in a comment above the statement, has **no**
   `ALTER TABLE`, and `env -u DATABASE_URL npm run db:generate` afterwards
   creates no `0009_*` and leaves `drizzle/meta/_journal.json` at eight entries
6. `lib/crm/queries.test.ts` — `createContact(tenantA, "Ana@x.test")` then
   `createContact(tenantA, "ana@x.test")` rejects with a `ContactError` whose
   `code` is `"duplicate_email"`, and `listContacts(tenantA, memory)` has one row.
   **Today this is false:** `lib/crm/queries-memory.ts` has no `toLowerCase` /
   `lower(` and `createContactInMemory` (`:137-143`) is a bare push. This
   criterion is the work that closes that, not a claim about current code.
7. `lib/crm/queries.test.ts` — two `createContact` calls with no `email`
   both succeed in one tenant (the property the seed does not cover, per §7)
8. `lib/crm/queries.test.ts` — the same address in `tenantA` and `tenantB`
   both succeed
9. `lib/crm/queries.test.ts` — `"  ana@x.test  "` is stored as
   `"ana@x.test"` on create and on update, and `""` is stored as `null`
10. `lib/crm/queries.test.ts` — `updateContact` onto another contact's
    address rejects; onto its **own** address with a new job title succeeds and
    the title changed
11. `lib/crm/queries.test.ts` — the pre-check's rendered SQL contains
    `lower("contacts"."email")` **and** `"contacts"."tenantId"`, carries
    `params === ["tenant-a", "ana@x"]`, and does **not** match
    `/"contacts"\."email"\s*=/`
12. `lib/crm/queries-drizzle.ts` exports `isUniqueViolation` and it returns
    `true` for `{ code: "23505" }` **with any message**, `true` for
    `{ message: 'duplicate key value violates unique constraint
    "contacts_tenantId_idx"' }` **with no code**, and `false` for
    `{ code: "42P10", message: "there is no unique or exclusion constraint
    matching the ON CONFLICT specification" }` — three cases, because a
    name-matching implementation fails the first two
13. `lib/crm/contact-actions.test.ts` — a taken address returns
    `{ ok: false, code: "duplicate_email", existing: { id, name, email } }`, and
    the same address in another tenant returns `{ ok: true }` with no `existing`
    key
14. `lib/crm/contact-actions.test.ts` — an update the store refuses returns
    `{ ok: false, code: "duplicate_email" }` with **no** `existing` key (the
    race-fallback shape), and an update keeping its own address returns
    `{ ok: true, contact }`
15. `lib/crm/contact-actions.test.ts` — `createContactForSession` with no
    session still rejects with `"Unauthenticated"`, and
    `findContactByEmail("", "x")` rejects with `"tenantId is required"`
16. `components/crm/contact-form.tsx` renders, inside the dialog,
    a `role="alert"` paragraph whose text is
    `{name} already uses {email}.` and a link named `Open {name}` with
    `href="/crm/contacts/{id}"` and an `onClick` that calls `onClose`; the
    input carries `aria-invalid` and `aria-describedby`; and on submit
    `router.refresh()` and `onClose()` do **not** run
17. The two user-facing sentences are the only strings the feature adds:
    `{name} already uses {email}.` and
    `Could not save that contact. That email may already be in use.` — and a
    grep over `components/crm/contact-form.tsx` finds none of `duplicate`,
    `unique`, `index`, `constraint`, `23505`, `42P10`, `lower(`,
    `case-insensitive`, `email_lower_idx`
18. `lib/client-boundary.test.ts` green; `components/crm/contact-form.tsx`
    has **no** value import of `ContactError`, `lib/crm/queries.ts`,
    `lib/crm/schema.ts`, `lib/db`, `drizzle-orm`, or
    `@neondatabase/serverless` — the error class is imported by the action and
    the store only, and the client takes `ContactResult` as a type
19. `components/crm/crm-pnw.test.ts`, `components/crm/crm-pass.test.ts`,
    `tests/theme-contrast.test.ts`, `tests/workroom-namespace.test.ts`,
    `tests/crm-shell.test.ts` all green with no edits
20. `e2e/crm-contacts.spec.ts` has two tests: the duplicate journey asserts
    the alert text and the `Open {name}` link **inside the dialog** and asserts
    the dialog is hidden after the link is clicked, and the cross-tenant
    journey creates the same address in the demo and owner tenants and asserts
    both rows exist. Both mint their own `Date.now()` addresses inside the test
    body, `afterEach` deletes what it created, and **no test asserts an exact
    row count**
21. **Injection-proven, each probe reversed byte-identically and the result
    recorded in the shipped notes:**
    (a) delete the `uniqueIndex` declaration → the schema test fails naming
    `contacts_email_lower_idx` (`expected [] to deeply equal
    [ 'contacts_email_lower_idx' ]`);
    (b) change the index to the data engineer's global
    `.on(sql\`lower(${table.email})\`)` → the column-order assertion fails
    showing `['lower("contacts"."email")']` against
    `['tenantId', 'lower("contacts"."email")']`, **and** the narrowed
    `tenantId indexes` gate still passes (it no longer sees the composite) —
    which is why criterion 2 pins the order and not just the set;
    (c) put `.unique()` back on `contacts.email` → the
    `isUnique === false` assertion fails;
    (d) remove the guard from `createContactInMemory` → criterion 6's test fails
    with two rows instead of a rejection, and criterion 7's test still passes —
    if **both** pass after the removal, the memory guard is not what CI is
    actually running;
    (e) make `isUniqueViolation` match the index name instead of the SQLSTATE
    → criterion 12's first two cases fail.
    **A guard that cannot be broken by injection is not a guard; a criterion
    that cannot fail is not a criterion.**
22. `AUTH_SECRET=ci-build-placeholder npm run build` exit 0 **before**
    `env -u DATABASE_URL npm test`, because `vitest` does not typecheck and
    `next build` is what catches a non-async export from a `"use server"`
    module (§1.2) and typechecks `e2e/`
23. `AUTH_SECRET=local-playwright-secret npx playwright test
    e2e/crm-contacts.spec.ts e2e/crm.spec.ts` green with the dev `.env` creds,
    after confirming nothing foreign owns `:3000`
24. §7 steps 1–7 executed and recorded in the shipped notes: generated file
    read, `IF NOT EXISTS` + caveat added, second generate a no-op, pre-flight
    returned zero rows, `db:migrate` on **dev** pre-merge, `pg_indexes`
    read-back showing `contacts_email_lower_idx` UNIQUE over both columns with
    `contacts_tenantId_idx` still non-unique, and the three live probes
    (same-tenant case-variant refused; other-tenant same address accepted; two
    `NULL` emails both inserted)
25. `lib/db/seed.ts` is **byte-unchanged** (`git diff -- lib/db/seed.ts`
    empty): its only conflict targets are `tenants.name` at `:150` and the
    untargeted form at `:202`, and no CRM write uses `onConflict`
26. No new dependency; no `onConflict` added anywhere in `lib/crm/`; no
    second list helper; no Tailwind, shadcn, TanStack Query, or TanStack Router

## Verify command

Build before test.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build
```

The three-part Playwright variant is not used here — the spec is unit-test
gated; the live-unique behaviour is verified by the migration file and a
manual Neon probe after `npm run db:migrate`. Add
`npx playwright test e2e/contact*.spec.ts` if a Playwright journey is created
(this card does not write one).

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** `lib/crm/schema.ts:48` is the bare
nullable `text("email")`; `:59` is the only `contacts_tenantId_idx`. `lib/crm/
queries.ts:210` is `createContact` passing `input.email` through untouched
(verified line noted in the spec; treat as approximate — re-verify at spec time
on this card).

**Calendar.** Sits behind `feat-001` (11.1). Order-free with 11.2, 11.4,
11.7, 11.8 after 11.1. The migration is the only DDL in the phase; the spec
calls for it to land after 11.2 so it runs alone in a single migration.

**Dev branch migration, post-merge.** `npm run db:migrate` for 0008. The
spec's live proof is reading the index from `pg_indexes` — `contacts_email_lower
_idx` present, no case-variant duplicates allowed.

**Recorded limits, carried from the spec:** the memory repo proves policy, not
SQL; the live SQL is verified by reading the migration and the in-file index
declaration; CI does not run Postgres; no Playwright for this card.
