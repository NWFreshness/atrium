# JOB-001 — Gate and land CRM e2e coverage for pipeline and activities (11.1)

## Goal

`e2e/crm-pipeline.spec.ts` and `e2e/crm-activities.spec.ts` exist, assert persistence after
`page.reload()` rather than optimistic DOM, and are proven by a real Playwright run against the
dev Neon branch — so that `feat/11.1-crm-e2e-coverage` can be reviewed and merged on evidence
instead of on PR prose.

The implementation is already committed on that branch (commit `2552beb`, PR #92). This job is the
gate, not the build. `/factory-implement` scope is therefore the diff that is missing, the fixes
the review finds, and nothing else.

## Scope paths

```
e2e/crm-pipeline.spec.ts
e2e/crm-activities.spec.ts
e2e/crm.spec.ts                  # read-only unless a fix is required by AC14
playwright.config.ts             # comment-only, per AC18
.github/workflows/ci.yml         # READ-ONLY. PR #90 (76e4d35) already gates six secrets. Do not edit.
```

Branch `feat/11.1-crm-e2e-coverage`, worktree `/home/tylermayfield/Documents/atrium/.worktrees/t_1358541a`.
Never commit to or push `main`.

## Out of scope

- `e2e/crm-deals.spec.ts` — 11.2 owns it. Journeys F and G are written into the 11.1 spec as 11.2's
  contract; creating the file here would pin deal write behaviour that 11.2 is about to change.
- **Any edit under `app/**`, `components/**`, or `lib/**`.** This is a test-only feature. If a
  journey fails on a missing affordance, that is a defect report for the feature that owns the
  surface, not a patch here — the same rule 10.3 set.
- Sorting assertions (11.4), edit-from-detail journeys (11.5), deal filters (11.8), QuickFind
  and `/crm/tasks` (11.10), delete-consequence copy (11.7).
- Activity delete/edit journeys and the truncated `Mark {description}` done name — 11.3, which
  truncates the checkbox in the same change. Journey E uses the current full-description name.
- Same-column reorder and drag-to-Won/Lost browser coverage. Recorded as unproven limits in the
  spec, not guessed at.
- Screenshot goldens.
- **Purging the 3 orphaned activities the suite leaves behind.** See Notes — agreed out of scope,
  reported to 11.3.
- Merging PR #92. Never merge unless the user asks.
- Linting. `npm run lint` carries 16 pre-existing `react-hooks` findings in Groove/Space; CI has
  no lint step and this card does not create one.

## Acceptance criteria

1. The five new journeys are present: three in `crm-pipeline.spec.ts` (six-column render with each
   seeded deal inside its seeded column, scoped by `column(stage)`; mouse drag; keyboard drag) and
   two in `crm-activities.spec.ts` (activity persists and sorts newest-first; done toggle).
2. Both drag journeys assert the moved column **after `page.reload()`**, not only in the DOM before
   one, and both assert `25%` after the reload. Both also wait for the action's POST before
   reloading — the optimistic rebase otherwise satisfies the poll and the reload aborts the write.
3. The keyboard journey calls `card.scrollIntoViewIfNeeded()` before `focus()`, carries a comment
   with the measurement (0/3 without it, 5/5 with it), and polls `[aria-live]` scoped to
   `rfd-announcement-` — not a bare `.first()`, which also matches Next's `__next-route-announcer__`.
4. The mouse drag aims at `[data-rfd-droppable-id]`, not `section.y + 30` (which lands inside the
   column `<header>` and only resolved via the library's closest-by-centre fallback).
5. `e2e/crm.spec.ts` still passes 4/4 with its steps and strings unchanged. No user-visible copy is
   altered anywhere in this feature.
6. `e2e/crm-deals.spec.ts` does **not** exist, and is not in the Playwright invocation.
7. Neither new file declares a `test.beforeAll` that writes, neither imports a shared mutable
   fixture object, no assertion anywhere checks an exact row count, and every mutating test mints a
   `Date.now()`-suffixed name inside its own body.
8. Every navigation- or server-action-following assertion carries `{ timeout: NAV_TIMEOUT }` with
   `NAV_TIMEOUT = 20_000`. The only `waitForTimeout` calls are the fixed pauses inside the
   incremental mouse-drag loop (8 moves, >=20 ms apart), where a real elapsed interval is what
   `@hello-pangea/dnd`'s mouse sensor requires.
9. Every `getByRole` that could substring-match uses `{ exact: true }`, including the
   `Date.now()`-fixture-derived button and link names. The single deliberate substring match is
   `toContainText("25%")`, and its comment says so.
10. Each multi-screen journey opens with `test.setTimeout(...)` (60 s), with a comment naming the
    30 s per-test default as the reason.
11. Both files throw from `beforeAll` without the owner pair and `test.skip` cleanly without the
    demo pair, matching `e2e/crm.spec.ts:14-20` and `:42-45`. Verified both directions, not one.
12. `playwright.config.ts` carries a comment saying `fullyParallel` is false because the specs share
    one demo tenant. Comment only — the value is still `false` and no other line changes.
13. **Injection-proven, both probes reverted byte-identically:** with `moveDealForSession` returning
    `null` without writing, both drag tests go red **on the post-reload assertion** (the pre-reload
    poll still passes) — a journey that stays green with the write removed is not evidence and must
    be rewritten. And with `onToggle` not calling the action, the done-toggle test goes red on the
    label-flip assertion. The **third** probe is a recorded correction to the spec: removing only
    the rebase at `move-deal.ts:60` leaves all three pipeline tests green, because
    `updateDealInDrizzle` also computes probability via `nextProbabilityOnStageChange`
    (`lib/crm/queries-drizzle.ts:327`). Removing both makes both drag tests red on `25%` with `10%`
    received. The spec's single-site probe is a no-op; both files must document that at the
    assertion so a future green run is not mistaken for coverage.
14. `e2e/crm.spec.ts` is unchanged in behaviour **and** the four pre-existing journeys are still
    green (4 passed).
15. The demo tenant has no leftover rows from these journeys afterwards: 0 `E2E%` rows in `deals`.
    Activities are exempt — see Notes.

## Verify command

Run from the repo root of the worktree, in this order. `vitest` does not typecheck; `next build`
is what typechecks `e2e/`, so build comes before Playwright, not after.

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=ci-build-placeholder npm run build \
  && AUTH_SECRET=local-playwright-secret npx playwright test e2e/crm.spec.ts e2e/crm-pipeline.spec.ts e2e/crm-activities.spec.ts
```

`local-playwright-secret` is a placeholder name, not a literal — substitute a real
`openssl rand -base64 32` value. `.env` has no `AUTH_SECRET`, which is why the flag is passed on the
command line: `playwright.config.ts:3-7` loads `.env` for the runner and the `webServer` inherits the
runner's environment, so a dev server started without one throws `MissingSecret` from
`/api/auth/callback/credentials`. Before running, confirm nothing foreign is listening on `:3000`
(`ss -ltnp | grep :3000`) — `reuseExistingServer: true` makes a foreign `next-server` hijack the
run silently. Kill by PID; never `pkill -f next-server`.

The full command must exit 0. A partial run is not evidence: `npx playwright test` exits 0 when
every test skips, so a green exit with 0 passed is a failure of this card.

## Done evidence

**2026-10-05T12:31:00Z — gate green, status BLOCKED (not passing).**

```
env -u DATABASE_URL npm test \
  && AUTH_SECRET=*** npm run build \
  && AUTH_SECRET=*** npx playwright test e2e/crm.spec.ts e2e/crm-pipeline.spec.ts e2e/crm-activities.spec.ts
→ exit 0
  Test Files  114 passed (114)      Tests  932 passed (932)
  ✓ Compiled successfully in 1122ms
  Running 9 tests using 3 workers
  9 passed (18.4s)                  0 skipped
```

All five new journeys named and passing: `crm-pipeline.spec.ts:215` board renders (3.5s), `:248`
mouse drag (8.1s), `:378` keyboard drag (4.9s); `crm-activities.spec.ts:174` activity persists
(7.5s), `:239` done-toggle label flip (8.1s). Four pre-existing `crm.spec.ts` journeys pass
unchanged. `AUTH_SECRET` generated inline per stage, never written to a file.

**Not passing: `verify green but acceptance unmet`.** `/factory-review` (session 4) returned
REQUEST CHANGES and both findings were still open on disk at the time of this run — the 11.1 spec
header plus its 21 unchecked boxes, and `HANDOFF.md:5` contradicting `features/INDEX.md`. A green
gate does not accept a change set. `/factory-verify` must re-run the command after those land before
it may write `passing`.

## Review

**2026-10-05, session 4 — REQUEST CHANGES.** Scope A PASS, Acceptance B **FAIL**, Verify hook C
PASS, Evidence D PASS, Harness E PASS, Bans F PASS, Restartability G **FAIL** (caused by B2).

Two findings, both state documents already listed in `## Scope paths`, neither product behaviour:

1. **This spec file was not updated.** `features/phase-11-crm-integrity/11.1-crm-e2e-coverage.md`
   still reads `**Status:** in_progress` (line 4) and carries **21 unchecked acceptance boxes, 0
   checked**. The scope line above promises "acceptance checkboxes + shipped notes". The file does
   not appear in `git diff main...HEAD` at all.
2. **The three status sources contradict each other.** This spec header says `in_progress`;
   `features/INDEX.md` says `completed`; `HANDOFF.md:5` still says `Stop. Phase 11 is specced.
   11.1 is in progress.` A cold session is instructed to read `HANDOFF.md` first and is therefore
   told the opposite of `INDEX.md`.

Findings 1 and 2 named the retired board. That board was removed. Do not recreate
`features/`, `CURRENT_FEATURE.md`, or `HANDOFF.md` to close them. Status lives in
`feature_list.json` only, and feat-001 is already `passing`.

The other 13 criteria were checked against the real files and hold. The code needs no change.
`/factory-verify` must still run the gate itself before any status becomes `passing`.

## Notes

**Session 2 (implement) — one failure observed here, 2026-10-05; CORRECTED in session 8.**
The card's verify command, run at default workers, first gave **3 failed / 6 passed**, all three
identical: `expect(page).toHaveURL("/")` inside `login()` stuck on `/login` for the full
`Timeout: 5000ms`, including the pre-existing `crm.spec.ts` demo walk. `crm.spec.ts` alone passed
4/4 and all three files with `--workers=1` passed 9/9 twice, so the working hypothesis was three
simultaneous logins against one cold `next dev` outrunning the 5 s default — `login()` being the one
assertion in those files without `NAV_TIMEOUT`.

**That failure never reproduced.** After PR #92 merged, `main` was re-measured four times with the
5 s default still in place: `9 passed` every run (15.0s / 16.4s / 19.3s / 19.1s). The hypothesis was
never isolated, the dev server was warmer on later runs, and **the `toHaveURL("/", NAV_TIMEOUT)`
change was deliberately not landed** — see `fix/11.1-login-timeout-and-board-docs`, which carries the
doc corrections only. A change whose motivating failure cannot be reproduced is not a fix.

What survives: `login()` genuinely lacks the `NAV_TIMEOUT` its sibling assertions carry, which is a
real inconsistency on a cold CI run but an untested risk, not an observed defect. `crm.spec.ts` has
the same default and was never edited (AC5).

**Harness defect found while running the gate, out of this card's scope.** `vitest.config.ts`
excludes `node_modules`, `e2e` and `.next`, but not `.worktrees`. With
`.worktrees/t_1358541a` present, a `vitest` run from the repo root collects **228** test files of
which **114 are under `.worktrees/`** — the entire suite runs twice and every count is doubled.
The real count is **114 files / 932 tests**. This card's `Scope paths` do not include
`vitest.config.ts`, so it was not fixed here; it needs its own card.

**Orphaned activities — 11.3 defect report, deliberately out of scope (agreed 2026-10-05).**
Deleting a deal only sets `activities.dealId` to NULL (`onDelete: "set null"`,
`lib/crm/schema.ts:103`) and the product has no activity-delete affordance, so this suite's own
cleanup cannot remove the activities it creates. Measured: **3 orphaned activities per
`crm-activities.spec.ts` run**, 0 leftover deals. They surface as the newest rows on `/crm`'s
"Recent activity" feed — after one run, 8 of the top 8 entries were E2E orphans. **Operationally:
Reset demo after runs of that file.** 11.3 owns activity delete/edit and should carry the fix.

**Tenant state read at the end of session 2, directly against Neon.** After Reset demo:
`E2E%` deals **0**, `E2E%` activities **0**, 6 seeded deals present, 4 seeded activities present.
Before the reset there was 1 `E2E%` deal, `E2E Probe 1790725689738`, `createdAt
2026-09-29T23:48:09Z` — **pre-existing, from the PR author's own run, not from this job** — and 40
`E2E%` activities (18 pre-existing + 22 from this session's nine runs). AC15 reads clean now.

**How the credential gates must be tested, or they lie.** `playwright.config.ts:3-7` calls
`process.loadEnvFile(".env")`, so unsetting `AUTH_OWNER_EMAIL` on the command line does **not**
remove it — `loadEnvFile` repopulates it and the gate reports a false pass. To test the gates,
temporarily replace the worktree's `.env` **symlink** with an empty file (the repo-root `.env` is
never touched; restore the symlink afterwards). Measured both ways: no owner pair throws
`AUTH_OWNER_EMAIL and AUTH_OWNER_PASSWORD are required for e2e` from `beforeAll`; no demo pair →
5 skipped.

**CI has never run this suite, and a green `e2e` job does not mean it did.** The repo holds **zero**
Actions secrets, so the job reports `ready=false` and skips Playwright; every local verification in
this card's history is local-only. Read the log for `ready=true` and a non-zero Playwright count
before believing any green CI badge on this branch.

**Recorded limits, carried from the spec** (do not "fix" them here): the deals surface still has no
browser coverage (11.2); same-column reorder and drag-to-Won/Lost are unproven in a browser;
screen-reader announcement *quality* is unproven (Journey C only proves the live region fires);
drag ergonomics and the 375 px layout are unproven; no visual-regression goldens; the `[aria-live]`
selector is the library's, not the app's. The spec's own measurements behind these were `n = 13`
mouse and `n = 22` keyboard on one machine and one Chromium build.

**Watch the retry count, not just green.** `playwright.config.ts:13` sets `retries: 1` in CI, which
hides a flake in the pass count. If the drag tests pass on a retry in the first three runs, the mouse
sequence needs revisiting before it is trusted.

**Demo tenant noise that is not from this feature:** `/crm/deals` carries 6 seeded deals plus one
pre-existing `Test` deal. Do not treat it as a leftover of this job.

**State coordination.** Status lives in `feature_list.json` only. The old board
(`features/`, `CURRENT_FEATURE.md`, `HANDOFF.md`) was removed; do not recreate it.
