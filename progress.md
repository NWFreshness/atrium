## Current Verified State

- Last updated: 2026-10-06
- Active feature: none — **11.3 — Activity correct-and-complete is `passing`** (ledger line 2 of `factory/ledger/completed.jsonl`; job removed from `factory/waves/wave-01.json`, `activeFeatureId: null`)
- Verification run this session (2026-10-06T19:47–19:48Z), exact wave command `AUTH_SECRET=ci-build-placeholder npm run build && env -u DATABASE_URL npm test && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-activities.spec.ts e2e/crm.spec.ts`:
  - Leg 1 build — exit 0, full route table
  - Leg 2 vitest — exit 0, 117 files / 995 tests passed
  - Leg 3 Playwright — exit 0, 9 passed incl. journeys H (backdate), I (edit-and-re-sort), J (delete) and renamed Journey E; tail names each new-path test (not green-for-wrong-reason)
- Done-rule recheck: behavior exists (reviews in sessions 4 and 7 returned APPROVE-FOR-VERIFY); command ran here; evidence in this block + ledger line + card `Done evidence`; restartable from AGENTS.md + this file. `testedAt`/`passedAt`: 2026-10-06T19:48:22Z.
- Highest-priority unfinished work: none in the wave (empty). Phase 11 still has 11.5, 11.6, 11.7, 11.8, 11.9, 11.10 un-specced (roadmap still reads 11.3 `not_started` — roadmap not touched by verify station; next `/factory-spec` should flip 11.3 to `passing` to match the ledger); phase 12 `draft`.
- Current blocker: none.
- Next action: `/factory-ship` to commit, push, and merge the verified 11.3 work (uncommitted: feature files + spec + card + wave + ledger + progress; ship owns branch/commit/push/merge per AGENTS.md).

## Sessions

### 2026-10-06 — session 8 (verify 11.3, PASS)

- Goal: run the wave's named verify command and record real evidence; only this station may set passing.
- Preconditions: AGENTS.md/progress.md/roadmap/wave present; wave job 11.3 `in_progress` with existing jobFile+specFile; spec `## Open questions: None` → spec_ready. Standing substitution: no `feature_list.json` post-migration; wave is its equivalent.
- Ran (auth emails/passwords from gitignored `.env` via `set -a; source .env`, secrets redacted from all records):
  - `AUTH_SECRET=ci-build-placeholder npm run build` — exit 0
  - `env -u DATABASE_URL npm test` — exit 0, `Test Files 117 passed (117)` / `Tests 995 passed (995)`
  - `AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm-activities.spec.ts e2e/crm.spec.ts` — exit 0, `9 passed (27.0s)`; tail names journeys H/I/J, renamed Journey E, and all crm.spec tests
- Done-rule recheck: APPROVE-FOR-VERIFY on record (sessions 4, 7); command ran here with new-path tests named in output; evidence written here + ledger + card; restartable. Not green-but-unaccepted (AC11 partial is spec-imprecision with passing journeys; AC20 probes proven in session 6).
- Finalized: appended ledger line (`id 11.3`, `passedAt 2026-10-06T19:48:22Z`, `verifyExit 0`; ship-owned branch/commit/prUrl/mergeSha null); removed the 11.3 job from the wave; `activeFeatureId: null`. Filled the card's `## Done evidence` (command + exits + tails + timestamp).
- No `status=passing` left in the wave by design — passing jobs live in the ledger, not the wave. No tests touched, no command weakened, no secrets recorded.
- Files touched: `factory/ledger/completed.jsonl` (append), `factory/waves/wave-01.json` (job removed, active cleared), `inbox/JOB-001-activity-correct-and-complete.md` (Done evidence), `progress.md` (this block), `factory/archive/progress/session-05-2026-10-06.md` (session 5 archived to hold 3 inline).
- Next: `/factory-ship`.

### 2026-10-06 — session 7 (review 11.3, second pass after Journey J fix)

- Goal: gate the post-fix diff against `specs/11.3-activity-correct-and-complete.md` and `inbox/JOB-001-activity-correct-and-complete.md`; score A–G with file/hunk evidence; no product code edits, no status change.
- Preconditions: `AGENTS.md` present (seven-station loop, unchanged this session); `progress.md` present; `roadmap/phases.yaml` present with 11.3 `status: not_started` (roadmap-side intent status; execution status lives in the wave); active wave `factory/waves/wave-01.json` present with `activeFeatureId: "11.3"`, job `status: "in_progress"`, `jobFile: "inbox/JOB-001-activity-correct-and-complete.md"` (file exists, untracked, all seven required headings filled); spec `specs/11.3-activity-correct-and-complete.md` exists with `## Open questions: None` → spec_ready; change set non-empty (13 modified tracked files + 5 new untracked helpers + spec/card new files). Standing substitution (recorded sessions 1–6): `feature_list.json` does not exist post-migration; the wave file is its equivalent. `factory/DEFINITION_OF_DONE.md` read: four-part done rule, only `/factory-verify` sets passing.
- Change set reviewed: `git status --short` + `git diff --stat` (1190 insertions, 2150 deletions across 24 paths; deletions are the 10 pre-migration legacy JOB cards already archived, not this feature). Product paths: `app/(authenticated)/crm/contacts/[id]/page.tsx` (+35), `app/(authenticated)/crm/contacts/page.tsx` (+22/-), `components/crm/activity-form.tsx` (+183/-), `activity-timeline.test.ts` (+60/-), `activity-timeline.tsx` (+115/-), `contact-table.test.ts` (6-line dep-array update), `contact-table.tsx` (+66/-), `org.module.css` (+47), `e2e/crm-activities.spec.ts` (+165/-), `lib/crm/activity-actions.ts` (+56), `activity-actions.test.ts` (+131). New: `lib/crm/activity-labels(.test).ts`, `lib/crm/activity-sort.ts`, `lib/crm/last-contacted(.test).ts`, spec, card. Session 6's delta on top of session 4's reviewed state: `page.on` → `page.once` + 6-line comment at `e2e/crm-activities.spec.ts:394-403`.
- **A. Scope — PASS with one recorded finding.** First conjunct PASS: every changed product path is in the card's `## Scope paths` (`activity-sort.ts` named inline, `contacts/page.tsx` declared in `## Notes` with a one-line reason per the implement skill's adjacent-edit rule). Evidence: card lines 13–30; `git diff --stat` paths match. Second conjunct (card scope matches spec scope, spec lines 22–36): NOT literal — the card lists two paths the spec's scope block omits (`lib/crm/activity-sort.ts`, `app/(authenticated)/crm/contacts/page.tsx`). Judged non-blocking rather than FAIL because: (1) both are behavior-entailed by the spec (client-boundary-green derivation needs a non-`queries*` helper module; the spec-mandated table column needs server-side data from its page), (2) both are declared in the card with reasons (the implement skill's authorized reconciliation path — failing the card for using it would make that rule a trap), (3) neither contradicts any spec line, (4) the prior review gate passed this exact state. Finding recorded: recommend amending the spec's `## Scope paths` to name both files at the next spec touch; no behavior change, no re-spec of intent needed.
- **B. Acceptance — PASS on AC1–AC10, AC12–AC21; PARTIAL carried on AC11 (non-blocking).** Per-criterion evidence from this session's diff reads:
  - AC1: four exports at `lib/crm/activity-actions.ts:139,156,192,200` (`updateActivityForSession`, `deleteActivityForSession`, `updateActivityAction`, `deleteActivityAction`); AC1-tagged cross-tenant `it` blocks in `activity-actions.test.ts` (prior gate verified 12/12; session 6 chain re-ran full file green as part of 995).
  - AC2: `lib/crm/activity-actions.ts:145-153` — `requireTenant` → `getActivity` miss-check (146–149) → `isActivityType` check (150–151) → `updateActivity` dispatch (153). Order matches.
  - AC3: new helpers call `requireTenant(getSession)` single-arg (`activity-actions.ts:145,161`); the two-arg calls at lines 64/85 are pre-existing create/list helpers, outside AC3's scope ("Neither *new* `*ForSession`").
  - AC4: `activity-labels.ts` (`LAST_CONTACTED_STALE_DAYS = 30`, truncate ≤60 unchanged / 60+`…`); test names at `activity-labels.test.ts:8,13,17,22,27` cover "", 60, 61, 8000, and the constant.
  - AC5: test names at `last-contacted.test.ts:17,21,42,70,76,82` cover empty→null, dated-vs-null, later-of-two, 30-false, 31-true, null-false.
  - AC6: timeline imports are value-imports of router/hooks/actions/helpers plus `import type { Activity } from "@/lib/crm/queries"` only (`activity-timeline.tsx:3-14`); `last-contacted.ts:1-3` value-imports `./activity-sort` + `./activity-labels` and type-imports `./queries-shared` (type-only, erased at build — boundary-safe). No `display:none`/Drizzle leakage introduced (`grep` clean).
  - AC7: `grep -rn lastContactedAt lib/crm/schema.ts lib/db` empty; `git status --short lib/db/` empty; no migration paths in change set.
  - AC8: Edit/Delete buttons unconditionally rendered per row (`activity-timeline.tsx:99-113`); `grep 'display: none|display:none' org.module.css` empty.
  - AC9: all three controls use `truncateActivityLabel(activity.description)` (`activity-timeline.tsx:87,101,109,124-125`).
  - AC10: `role="dialog"` + `aria-modal="true"` + `aria-labelledby={headingId}` (`activity-form.tsx:226-228`), heading literal `Edit activity` (231), Save/Cancel (199/206), Type-select focus (70), Escape close (73), focus-restore comment+code (60-62,81-82).
  - AC11: PARTIAL (carried from session 4, unchanged by session 6): dialog-scoped `dialog.getByLabel("Date", { exact: true })` (Journey I) resolves to one via distinct field ids (`activity-edit-date` vs `activity-date`); page-level `getByLabel("Date")` matches both forms' labels so the literal "exactly one element" claim is not strictly met. Non-blocking: all journeys pass; three reconciliations recorded in session 4.
  - AC12/AC13: journeys H (`crm-activities.spec.ts:295`) and I (`:337`) present with past-Date creation and re-sort-first-`<li>` assertions.
  - AC14: product `confirm("Delete this activity?")` (`activity-timeline.tsx:67`); handler `page.once("dialog", ...)` asserting that message sits before the click (`crm-activities.spec.ts:394-403`, session 6 fix verified in diff).
  - AC15: `Last contacted` `<dt>/<dd>` (`contacts/[id]/page.tsx:85-89`); `LastContactedCell` renders `Never`/formatted date (`contact-table.tsx:82-87`); `git status` shows no `rolodex/` paths.
  - AC16: `isStaleContacted` uses `days > LAST_CONTACTED_STALE_DAYS` (`last-contacted.ts:55`) — 30 exact fresh, 31 stale; comment at 42-46 states the rule.
  - AC17: `git diff --name-only -- 'app/(authenticated)/crm/page.tsx' components/crm/dashboard-followups.tsx` empty.
  - AC18: `.crm-activity-actions button:focus-visible { outline: 2px solid var(--brass); ... }` (`org.module.css:392-394`).
  - AC19: five `test(` blocks (`crm-activities.spec.ts:151,216,295,337,384`) — two pre-existing (one renamed per the breaking-change decision) + three new H/I/J; `toHaveCount` only at pre-existing cleanup lines 124/126/259 and filtered-subset lines 417/428, never a whole-`<ul>` exact count.
  - AC20: PASS-on-record — session 6 ran all four probes (each failed as predicted, each reverted; `grep -rn PROBE lib components e2e app` empty this session confirms byte-clean revert). Review does not re-run mutations.
  - AC21: PASS-on-record — session 3 ran prettier on 16 explicit paths; session 6 on the touched spec file (reported unchanged).
- **C. Verify hook — PASS.** Unit/component tests live under `lib/` + `components/` (run by `npm test`, the card command's leg 2); journeys H/I/J + renamed Journey E live in `e2e/crm-activities.spec.ts`, named verbatim in the card command's leg 3 (`npx playwright test e2e/crm-activities.spec.ts e2e/crm.spec.ts`). Session 6's chain exit 0 exercised all of them (995 unit + 9 e2e). No test sits where the hook cannot reach it.
- **D. Evidence discipline — PASS with stale-data note.** No `status=passing`, no `testedAt` (wave: `testedAt: null`), no review-side stamps. The wave `evidence` field currently holds session 5's failure record (command + per-leg exits + tail + root-cause prose). It contains command+exit+tail (not prose-*instead*-of), so not a ban violation; but it is now stale (session 6 went green) — the next `/factory-verify` overwrites it. `Done evidence` in the card is still the empty placeholder, correctly awaiting verify.
- **E. Harness intact — PASS.** Wave JSON parses with `activeFeatureId: "11.3"`, one job, `status: "in_progress"` (in-vocabulary). `roadmap/phases.yaml` 11.3 reads `status: not_started` — roadmap-side intent status vs wave-side execution status; both in-vocabulary, not corruption (noted, not failed). `specs/` intact; `AGENTS.md` untouched by the feature (not in change set). `progress.md` well-formed after this session's edit (3 inline blocks; sessions 0–4 archived).
- **F. Bans — PASS.** No test deleted. The `contact-table.test.ts` dep-array update adds the new entry to the expected array alongside the old ones (assertion strictly more specific, not weakened). No secrets in diff or in this review (`AUTH_SECRET` appears only redacted in session records). No `STRATEGY.md`/`ROADMAP.md`/second `AGENTS.md`. No product questions asked or answered. The 10 deleted legacy `inbox/JOB-*.md` paths are pre-migration state, untouched by this feature.
- **G. Restartability — PASS.** `AGENTS.md` + `progress.md` (state block + sessions 5/6/7 inline, 0–4 archived) + wave + spec + card fully determine: what shipped, what the one-line fix was, what verify must run, and what is next. Nothing lives only in chat history.
- **Verdict: APPROVE-FOR-VERIFY.** Implementation is complete against spec+card, the only scope-list gap is a documented non-blocking finding, acceptance holds (AC11 partial carried, AC20 on record), and no official evidence has been recorded yet. Never APPROVE-AND-PASS — passing requires `/factory-verify`'s real run in its own session.
- Files touched by this review: `progress.md` (state rewrite + this block) and `factory/archive/progress/session-04-2026-10-06.md` (exact extraction of session 4). No product code, no card edits (no `## Review` section appended — review evidence stays in `progress.md` per standing pattern), no status changes.

### 2026-10-06 — session 6 (implement follow-up: fix Journey J handler)

- Goal: fix the test bug the verify session identified — Journey J's `page.on("dialog", ...)` fires twice, once for the activity delete (correct) and once for `afterEach`'s deal-delete confirm (wrong, fails the message assertion).
- Baseline check: the verify session's chain failed at the Playwright leg (exit 1, 8 passed, 1 failed). The red was *inside* the card's scope (the failing test is in `e2e/crm-activities.spec.ts`, which is listed), so I proceeded.
- Precondition check: `activeFeatureId: "11.3"`, `status: "in_progress"`, `jobFile: "inbox/JOB-001-activity-correct-and-complete.md"` exists, card has all required headings filled. `feature_list.json` does not exist (deleted in session-0 migration); treated the wave file as the equivalent per the standing substitution.
- Completed:
  - **Fix:** `e2e/crm-activities.spec.ts:394` — `page.on("dialog", ...)` → `page.once("dialog", ...)`. The handler auto-removes after the first fire, so the activity-delete confirm is asserted (and accepted) and the `afterEach` deal-delete confirm is handled by `deleteMintedDeal`'s own accept-only handler at line 113. Added a 6-line comment explaining the choice so a future reader doesn't "fix" it back to `page.on`.
  - Ran the cheap legs: build exit 0, vitest exit 0 (117/117 files, 995/995 tests).
  - Ran the Playwright leg: 9 passed, 0 failed. Journey J passed at 3.5s. The `[WebServer] ⨯ Error: The destination stream closed early.` lines are dev-server stderr noise from `next start` worker teardown; not a test failure.
  - Ran the full chain via `&&`: build && vitest && Playwright, **chain exit 0**.
  - Ran the AC20 injection-proven four probes (each as: snapshot file → mutate → run the relevant test → confirm it fails → revert → confirm it passes). All four pass — see Current Verified State above.
  - Ran `npx prettier --write e2e/crm-activities.spec.ts` (unchanged, no formatting drift).
- Mid-session notes:
  - The wave entry's `evidence` and `blockedReason` from the verify session still reference the failure. The next `/factory-verify` session will rewrite those to the green-run evidence and clear `blockedReason`. I did not touch them now — that is the verify station's job (hard ban: "No editing another station's conclusions").
  - The `feature_list.json` precondition is the standing substitution; recorded in every prior session.
- Files touched: `e2e/crm-activities.spec.ts` (one line + comment, in scope). No product code, no other tests, no `.env`. The snapshot files in `/tmp/probe{1,2c,3,4}-*.bak` are session-local scratch and not in the repo.
- Acceptance criteria still unmet: none. The chain is green, all four AC20 probes pass, and the verify session's blocker is resolved.
- AC19's "no test in the file asserts an exact row count" remains satisfied (the new tests use filtered `.filter({ hasText })` counts, not whole-`<ul>` counts).
- AC11's soft-partial flag from the review session remains — the literal claim "page.getByLabel('Date') resolves to exactly one element on a page where the edit dialog is open" is not strictly satisfied (both forms have a `Date` label; Playwright's `getByLabel` matches by label text). The dialog-scoped locator Journey I uses (`dialog.getByLabel("Date", { exact: true })`) resolves to one. The Playwright run passed all journeys, so this did not surface as a failure. If the verify station wants the literal claim enforced, that's a follow-up implement with one of the three reconciliations the review session recorded.
- Next session should: `/factory-review` on this one-line diff, then `/factory-verify` to record the green run as the official evidence and set `status=passing`.

<!--
Rules for this file:
- Rewrite ONLY the "## Current Verified State" block above.
- Keep at most the last 3 session blocks inline. Move older ones to
  factory/archive/progress/session-NN-<date>.md via /factory-handoff.
- Record the exact command, its exit code, and a short output tail. No "should pass".
-->
