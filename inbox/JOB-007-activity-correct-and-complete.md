# JOB-007 — Activity correct-and-complete (11.3)

## Goal

Activities can be **edited** and **deleted** from the timeline. They can be
**backdated** through a new `Date` field on `ActivityForm`. A contact's
**Last contacted** is derived and visible on the contact detail page and the
contacts table. Closes **G1**, **G7**, and **G8**. Merged spec — A2 (delete +
edit) + B4 (backdate + last-contacted) into one feature.

## Scope paths

```
lib/crm/activity-labels.ts                          # new — truncateActivityLabel, LAST_CONTACTED_STALE_DAYS
lib/crm/activity-labels.test.ts                     # new
lib/crm/last-contacted.ts                           # new — lastContactedAt, daysSinceContacted, isStaleContacted
lib/crm/last-contacted.test.ts                      # new
lib/crm/activity-actions.ts                         # add updateActivityForSession/Action + deleteActivityForSession/Action
components/crm/activity-form.tsx                    # activity? + onClose props; Date field; dialog mode; useId()
components/crm/activity-timeline.tsx                # Edit / Delete row controls; truncated Done-checkbox aria-label; dialog mount + focus restore
components/crm/org.module.css                       # .crm-activity-actions, .crm-stale (crm- prefixed)
components/crm/contact-table.tsx                    # Last contacted column (display, no accessor; unsortable in this card)
app/(authenticated)/crm/contacts/[id]/page.tsx     # Last contacted <dt>/<dd>
components/crm/activity-timeline.test.ts            # extend from one assertion to a real source gate
e2e/crm-activities.spec.ts                          # appended; file owned by JOB-001. Three new journeys (H backdate, I edit-and-re-sort, J delete) + 11.1 Journey E locator update
features/phase-11-crm-integrity/11.3-activity-correct-and-complete.md
features/INDEX.md
CURRENT_FEATURE.md
```

Branch convention: ship on `feat/11.3-activity-correct-and-complete`. Never
commit or push to `main`. Never merge unless the user asks.

## Out of scope

- **Activity creation UI anywhere new.** The inline `Add activity` form on
  the contact and deal detail pages stays as it is except for the new `Date`
  field.
- **Any edit/delete control on the dashboard feed or the follow-up panels.**
  `components/crm/dashboard-followups.tsx:36-59` and
  `app/(authenticated)/crm/page.tsx:64-96` are **not** modified.
- **`/crm/tasks`**, the follow-up surface, or a "See all" link — **11.9**.
- **Re-parenting an activity.** Edit does not offer an Organization/Contact/
  Deal picker. The FKs are nullable `SET NULL`, and a mis-click would
  silently orphan the row.
- **Undo / a toast.** No toast primitive in the repo; this phase adds none.
- **Time-of-day precision on `Date`.** Field is `type="date"`, midnight UTC.
- **A "last contacted" filter on contacts.** Out of this phase.
- **Deal number validation, deal filters, table sorting, detail-page edit,
  delete preview, QuickFind, the unique email index.** Those are 11.2, 11.4,
  11.5, 11.7, 11.8, 11.10, 11.6.
- **Editing `e2e/crm-pipeline.spec.ts`** or any other e2e file.
- **Rolodex strings.** The cross-app copy divergence is recorded, not fixed.
- **Linting.**

## Acceptance criteria

The full criteria are in `features/phase-11-crm-integrity/11.3-activity-correct-and-complete.md`
§"Acceptance criteria" (22 items). The card defends every item.

1. `lib/crm/activity-actions.ts` exports `updateActivityForSession`,
   `updateActivityAction`, `deleteActivityForSession`,
   `deleteActivityAction`. Tenant-B id under tenant-A session returns `null`
   in both directions.
2. `updateActivityForSession` returns `null` for an unknown activity type
   (`carrier-pigeon`); checked between the `getActivity` miss-check and the
   dispatch.
3. Neither new `*ForSession` passes `input` to `requireTenant`. The
   `ClientTenantInput` intersection is **not** added.
4. `lib/crm/activity-labels.test.ts`: `truncateActivityLabel("")` returns
   `""`; a 60-char string returns itself; 61 chars returns 60 + `…`; 8000
   chars returns 61. `LAST_CONTACTED_STALE_DAYS` is 30.
5. `lib/crm/last-contacted.test.ts`: empty list → `null`; one dated + one
   null-occurred → dated wins; two dated → later wins. `isStaleContacted`
   false at exactly 30 days, true at 31.
6. `lib/client-boundary.test.ts` stays green. `activity-timeline.tsx` keeps
   its `import type { Activity } from "@/lib/crm/queries"` and nothing more.
7. `lib/crm/schema.ts` contains **no** `lastContactedAt` column. No
   migration directory is created or changed.
8. The timeline's Edit / Delete buttons are visible at rest — assertable by
   `await expect(editButton).toBeVisible()` with no hover. The org stylesheet
   contains no `display: none`.
9. Every activity-row control's accessible name is the truncated form:
   `Edit activity: …`, `Delete activity: …`, `Mark activity: … done` /
   `Mark activity: … not done`.
10. The edit dialog is `role="dialog" aria-modal="true" aria-labelledby={useId()}`,
    heading literal `Edit activity`, submit `Save`, cancel `Cancel`. Open
    focuses the `Type` select; `Escape` closes and focus returns to Edit.
11. The inline form on `/crm/contacts/[id]` and `/crm/deals/[id]` is unchanged
    except for the new `Date` field. `page.getByLabel("Date")` resolves to
    exactly one element on a page where the edit dialog is open.
12. An activity created with a past `Date` renders `formatDate` of that day in
    the timeline **after a reload**.
13. An edited activity whose `Date` is later than every other activity on the
    page is the **first** `<li>` in the timeline **after a reload**.
14. A deleted activity is absent from the timeline `<ul>` **after a reload**,
    and the dialog handler was registered before the click. `confirm()`'s
    message is `Delete this activity?`.
15. Contact detail renders a `Last contacted` row with `formatDate(lastContacted)`
    or the literal `No activity yet`; the contacts table renders `Never` when
    there is no record. **Rolodex is not modified.**
16. A contact whose last contact is 31+ days ago renders ` · 31 days ago`
    **and** the `crm-stale` class; at 30 days, neither.
17. `components/crm/dashboard-followups.tsx` and `app/(authenticated)/crm/page.tsx`
    are byte-unchanged.
18. `components/crm/org.module.css` adds no `display: none`; the new button
    rule carries `outline: 2px solid var(--brass)` on `:focus-visible`.
19. `e2e/crm-activities.spec.ts` gains three tests (backdate, edit-and-re-sort,
    delete); **11.1's Journey E is updated to the new checkbox name in the
    same commit.** No test in the file asserts an exact row count.
20. **Injection-proven, four probes reverted byte-identically:** with the body
    of `deleteActivityForSession` returning `null` before dispatching, Journey J
    fails on the post-reload absence assertion; with `updateActivityAction` not
    called from the dialog, Journey I fails on the post-reload description
    assertion; with `onToggle` not calling the action, 11.1's Journey E fails
    on the label-flip; with `last-contacted.ts` returning the first array
    element instead of scanning, the unit test in AC5 goes red.
21. Three-part verify (build → vitest → Playwright) green.
22. `npm run format` was run with explicit paths; `features/INDEX.md` and
    `CURRENT_FEATURE.md` are not reflowed.

## Verify command

Per the spec §"Verification". Build before test.

```
AUTH_SECRET=ci-build-placeholder npm run build \
  && env -u DATABASE_URL npm test \
  && AUTH_SECRET=local-playwright-secret npx playwright test \
    e2e/crm-activities.spec.ts e2e/crm.spec.ts
```

`e2e/crm-activities.spec.ts` exists after JOB-001 lands; if 11.1 has not
merged, record the journeys unmet rather than creating a fifth spec file.

## Done evidence

<!-- Empty until /factory-verify runs. -->

## Notes

**Spec citations verified at intake.** `lib/crm/queries.ts:408-418` is
`deleteActivity`; `:394-406` is `updateActivity`; both already exist and are
tested. `components/crm/activity-timeline.tsx:75-79` is the done checkbox
that gets its aria-label truncated. `lib/crm/queries-shared.ts:168` is
`compareActivitiesNewestFirst` — already imported by `lib/crm/queries-memory.ts:
line 16` and used at `:293`. `lib/crm/schema.ts:100-103` is the activities FKs
(`contactId`, `dealId` both nullable `SET NULL`).

**Calendar.** Sits behind `feat-001` (11.1). **The 11.3 column on
`contact-table.tsx` shares a file with 11.4.** Phase order puts 11.4 first;
11.3 lands the column **last**, between `Status` and `Organization`, with **no**
sort options (a `display` column, no `accessorFn`, so `column_getCanSort`
returns false — exactly what 11.4's e2e must not assert). The spec states
plainly: this column ships unsortable in 11.3; 11.4 makes it sortable in its
own per-column pass.

**The Done-checkbox rename is a breaking change to a shipped string, on
purpose.** It breaks 11.1's Journey E locators. The implementer who finds a
red `e2e/crm-activities.spec.ts` after the component edit has found the
*expected* red and must fix the locators, not revert the name.

**Defects this card inherits.** From session 1 (`progress.md`):
`e2e/crm-activities.spec.ts` leaks 3 orphaned activities per run — agreed out
of scope for 11.1, **moved here**. The 11.3 implementation gains
`deleteActivityAction` (AC1) and a Delete button on every timeline row (AC14),
which makes `afterEach` cleanup finally able to delete its own rows. **Reset
demo before this card's Playwright run to clear the 11.1 leak.**

**Recorded limits, carried from the spec:** deletion is unrecoverable; two
activities sharing a 60-character description prefix are indistinguishable by
accessible name (the visible `<p>` is the disambiguator); no focus trap;
UTC-midnight date default; re-parenting question is unanswered; "last
contacted" is derived so it costs an extra read per contacts list; cross-app
copy divergence (`Never` / `No activity yet` / `Never contacted`) is
unresolved; the `Last contacted` column ships unsortable; `--clay-ink` on
`--bg-2` contrast claim is unverified until the gate re-runs; no screen-reader
pass; no screenshot goldens; vitest does not typecheck.