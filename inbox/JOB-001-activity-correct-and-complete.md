# JOB-001 — Activity correct-and-complete

<!-- 11.3 — Activity correct-and-complete. See specs/11.3-activity-correct-and-complete.md
     for the full design. This card is the intake-scoped distillation of that spec;
     where they disagree, the spec wins. -->

## Goal

Make the activity timeline correctable: every row gains visible-at-rest Edit and Delete controls; Edit mounts `ActivityForm` as a modal dialog with a new `Date` field; Last contacted is derived and shown on `/crm/contacts/[id]` and the contacts table (unsortable in this card).

## Scope paths

```
lib/crm/activity-labels.ts                          # new — truncateActivityLabel, LAST_CONTACTED_STALE_DAYS
lib/crm/activity-labels.test.ts                     # new
lib/crm/activity-sort.ts                            # new — compareActivitiesNewestFirst, lifted out of queries-shared so the Last contacted helper does not pull the database barrel into the client graph
lib/crm/last-contacted.ts                           # new — lastContactedAt, daysSinceContacted, isStaleContacted
lib/crm/last-contacted.test.ts                      # new
lib/crm/activity-actions.ts                         # add updateActivityForSession/Action + deleteActivityForSession/Action
components/crm/activity-form.tsx                    # activity? + onClose props; Date field; dialog mode; useId()
components/crm/activity-timeline.tsx                # Edit / Delete row controls; truncated Done-checkbox aria-label; dialog mount + focus restore
components/crm/org.module.css                       # .crm-activity-actions, .crm-stale (crm- prefixed)
components/crm/contact-table.tsx                    # Last contacted column (display, no accessor; unsortable in this card)
app/(authenticated)/crm/contacts/[id]/page.tsx     # Last contacted <dt>/<dd>
components/crm/activity-timeline.test.ts            # extend from one assertion to a real source gate
e2e/crm-activities.spec.ts                          # appended; file owned by JOB-001/11.1. Three new journeys (H backdate, I edit-and-re-sort, J delete) + 11.1 Journey E locator update
```

Adjacent edits, added with a one-line reason per the implement skill's scope rule:
- `app/(authenticated)/crm/contacts/page.tsx` — fetches `listActivitiesAction({})` and groups by `contactId` so the new column has the data it needs. The list page is the only place that can do this server-side without breaking the client boundary; the table component is unchanged in shape.

## Out of scope

- Activity creation UI anywhere new; the inline `Add activity` form on contact and deal detail pages only gains the new `Date` field.
- Any edit/delete control on the dashboard feed or the follow-up panels. `components/crm/dashboard-followups.tsx:36-59` and `app/(authenticated)/crm/page.tsx:64-96` are byte-unchanged.
- `/crm/tasks`, the follow-up section, or a "See all" link. That is 11.9.
- Re-parenting an activity. Edit does not offer an Organization/Contact/Deal picker.
- Undo or a toast. No toast primitive in the repo; this phase adds none.
- Time-of-day precision on `Date`. Field is `type="date"`, midnight UTC.
- A "last contacted" filter on contacts. Out of this phase.
- Sorting the new `Last contacted` column. 11.4 owns the per-column sort pass on the contacts table.
- Deal number validation, deal filters (general), table sorting (general), detail-page edit, delete preview, QuickFind, the unique email index. Those are 11.2, 11.4, 11.5, 11.7, 11.8, 11.10, 11.6.
- Editing `e2e/crm-pipeline.spec.ts` or any other e2e file outside the two listed.
- Rolodex strings. Cross-app copy divergence (`Never` / `No activity yet` / `Never contacted`) is recorded, not fixed.
- A new `lastContactedAt` column on `contacts`. `lib/crm/schema.ts` stays as-is. No new migration directory.
- Linting. Lint is not a gate.

## Acceptance criteria

1. `lib/crm/activity-actions.ts` exports `updateActivityForSession`, `updateActivityAction`, `deleteActivityForSession`, `deleteActivityAction`. Tenant-B id under tenant-A session returns `null` in both directions.
2. `updateActivityForSession` returns `null` for an unknown activity type (e.g. `carrier-pigeon`); the unknown-type check sits between the `getActivity` miss-check and the dispatch.
3. Neither new `*ForSession` passes `input` to `requireTenant`. The `ClientTenantInput` intersection is **not** added.
4. `lib/crm/activity-labels.test.ts`: `truncateActivityLabel("")` returns `""`; a 60-char string returns itself; 61 chars returns 60 + `…`; 8000 chars returns 61. `LAST_CONTACTED_STALE_DAYS` is 30.
5. `lib/crm/last-contacted.test.ts`: empty list → `null`; one dated + one null-occurred → dated wins; two dated → later wins. `isStaleContacted` false at exactly 30 days, true at 31.
6. `lib/client-boundary.test.ts` stays green. `activity-timeline.tsx` keeps its `import type { Activity } from "@/lib/crm/queries"` and nothing more.
7. `lib/crm/schema.ts` contains **no** `lastContactedAt` column. No migration directory is created or changed.
8. The timeline's Edit / Delete buttons are visible at rest — assertable by `await expect(editButton).toBeVisible()` with no hover. `components/crm/org.module.css` contains no `display: none`.
9. Every activity-row control's accessible name is the truncated form: `Edit activity: …`, `Delete activity: …`, `Mark activity: … done` / `Mark activity: … not done`.
10. The edit dialog is `role="dialog" aria-modal="true" aria-labelledby={useId()}`, heading literal `Edit activity`, submit `Save`, cancel `Cancel`. Open focuses the `Type` select; `Escape` closes and focus returns to Edit.
11. The inline form on `/crm/contacts/[id]` and `/crm/deals/[id]` is unchanged except for the new `Date` field. `page.getByLabel("Date")` resolves to exactly one element on a page where the edit dialog is open.
12. An activity created with a past `Date` renders `formatDate` of that day in the timeline **after a reload**.
13. An edited activity whose `Date` is later than every other activity on the page is the **first** `<li>` in the timeline **after a reload**.
14. A deleted activity is absent from the timeline `<ul>` **after a reload**, and the dialog handler was registered before the click. `confirm()`'s message is `Delete this activity?`.
15. Contact detail renders a `Last contacted` row with `formatDate(lastContacted)` or the literal `No activity yet`; the contacts table renders `Never` when there is no record. **Rolodex is not modified.**
16. A contact whose last contact is 31+ days ago renders ` · 31 days ago` **and** the `crm-stale` class; at 30 days, neither.
17. `components/crm/dashboard-followups.tsx` and `app/(authenticated)/crm/page.tsx` are byte-unchanged.
18. `components/crm/org.module.css` adds no `display: none`; the new button rule carries `outline: 2px solid var(--brass)` on `:focus-visible`.
19. `e2e/crm-activities.spec.ts` gains three tests (backdate, edit-and-re-sort, delete); **11.1's Journey E is updated to the new checkbox name in the same commit.** No test in the file asserts an exact row count.
20. **Injection-proven, four probes reverted byte-identically:** with the body of `deleteActivityForSession` returning `null` before dispatching, Journey J fails on the post-reload absence assertion; with `updateActivityAction` not called from the dialog, Journey I fails on the post-reload description assertion; with `onToggle` not calling the action, 11.1's Journey E fails on the label-flip; with `last-contacted.ts` returning the first array element instead of scanning, the unit test in AC5 goes red.
21. `npm run format` was run with explicit paths. No unrelated files are reformatted.

## Verify command

The AGENTS.md two-liner has no Playwright; this card ships browser coverage on the activity timeline, so the feature verify is the three-part command named in the spec's `## Verify command` section. It uses real, existing tools (`npm run build`, `vitest`, `playwright`) and the two existing e2e spec files. It is a strict superset of the AGENTS.md two-liner, not a parallel hook.

```
AUTH_SECRET=ci-build-placeholder npm run build \
  && env -u DATABASE_URL npm test \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-activities.spec.ts e2e/crm.spec.ts
```

Precondition for the Playwright leg: reset the demo before the run to clear 3 orphaned activities left per run by 11.1's `e2e/crm-activities.spec.ts`. AC20 (injection-proven) is checked in the same session as the verify run and recorded in `progress.md`.

## Done evidence

- Command: `AUTH_SECRET=ci-build-placeholder npm run build && env -u DATABASE_URL npm test && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-activities.spec.ts e2e/crm.spec.ts` (run 2026-10-06T19:47–19:48Z; auth emails/passwords from gitignored `.env`, `AUTH_SECRET` redacted above)
- Exit code: 0 on all three legs (build 0; vitest 0 — 117 files / 995 tests passed; Playwright 0 — 9 passed incl. journeys H backdate, I edit-and-re-sort, J delete, and renamed Journey E)
- Tail: `9 passed (27.0s)`; unit tail `Tests 995 passed (995)`; build tail full route table
- Note: session 5's run of the same command exited 1 on Journey J (persistent `page.on("dialog")` handler); fixed in session 6 (`page.once`), green since. AC20's four injection probes each failed as predicted and were reverted byte-clean in session 6.

## Notes

- This card is the intake-scoped distillation of `specs/11.3-activity-correct-and-complete.md`. Where the two disagree, the spec wins. The archived pre-migration `JOB-007` is the source of the AC set, scope, and verify command; it is cited for traceability and is not modified.
- The Done-checkbox rename is a breaking change to a shipped string, on purpose. It breaks 11.1's Journey E locators. The implementer who finds `e2e/crm-activities.spec.ts` red after the component edit has found the *expected* red and must fix the locators (11.1 Journey E), not revert the name. Both edits land in the same commit.
- The `Last contacted` column ships as a `display` column with no `accessorFn`; `column.getCanSort()` returns false. 11.4's e2e must not assert sorting on this column. The sortable header pass for this column is **not** in this card.
- Numbering: `inbox/` was empty at intake time. `JOB-001` is the next number, not a re-use of the archived `JOB-001-crm-e2e-pipeline-activities.md` (which is 11.1 and is `passing`).
- Active feature in the wave stays `activeFeatureId: "11.3"` per the spec station's last edit. The wave entry's `status` field is the gate for `in_progress` and stays `not_started` until the user asks to start.
