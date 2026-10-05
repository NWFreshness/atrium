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
features/phase-11-crm-integrity/11.6-contact-email-uniqueness.md
features/INDEX.md
CURRENT_FEATURE.md
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

The full criteria are in `features/phase-11-crm-integrity/11.6-contact-email-uniqueness.md`
§"Acceptance criteria". The card defends every item.

1. `contacts` declares
   `uniqueIndex("contacts_email_lower_idx").on(table.tenantId, sql\`lower(${table.email})\`)` —
   **tenant-composite**, not global. Nullable emails are unaffected (nullable
   columns are exempt from unique indexes in Postgres).
2. `drizzle/0008_*.sql` is the hand-edited idempotent migration pair:
   `DROP CONSTRAINT IF EXISTS <old>` (if any exists) and
   `CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_lower_idx …`. The
   0004/0005/0006 precedent applies — IF NOT EXISTS is hand-added, the
   "name-not-definition" caveat documented in the file.
3. `lib/crm/queries.ts`'s `createContact` and `updateContact` perform a
   case-insensitive duplicate pre-check **before** insert/update, and the
   Drizzle `*.onConflictDoNothing()` twin does not target the column name —
   Postgres cannot infer an expression index from a column conflict target
   (the same defect 8.1 fixed for `users`).
4. A case-variant duplicate at the boundary is refused with the typed code
   `email_taken`. The action returns it; the dialog surfaces the message and a
   link to the existing record.
5. **Memory repository matches Drizzle**: case-insensitive lookup returns the
   existing contact; a `null` email insert succeeds; the same id with a
   case-variant email fails.
6. **`lib/crm/queries-drizzle.ts`** does not contain `assertText` (already true),
   and the new lookup uses `lower()` exactly as the index does. `escapeIlike`
   is unaffected.
7. **Injection-proven, both probes reverted byte-identically:**
   - removing the pre-check leaves the typed code unreachable, the unit test
     that asserts it goes green (a vacuous green is the failure mode this
     exists to catch);
   - removing the index by hand from the migration re-applied fails the live
     unique-constraint test (vitest cannot run the live Postgres; the
     repository test plus the live migration check are the gate).
8. `lib/db/seed.ts` either runs unchanged or, if the upsert against the new
   index breaks, mirrors the 8.1 fix exactly: a `lower(email)` lookup, then
   an update by id or an untargeted `on conflict do nothing`. The seed remains
   idempotent.
9. Existing dialogs (`OrgForm`, `DealForm`) are not changed. Only
   `contact-form.tsx` gains the duplicate-error slot.

## Verify command

Per the spec. Build before test.

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