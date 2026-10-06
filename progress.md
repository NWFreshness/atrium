## Current Verified State

- Last updated: 2026-10-06
- Active feature: none
- Verification last run: `env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build` — not re-run during migration; the pre-migration tree (snapshot in `factory/archive/pre-migration/`) was green at session 19 (114 files / 932 tests, exit 0). That is the carried-forward baseline.
- Highest-priority unfinished feature: none (the pre-migration `feature_list.json` had `feat-004` through `feat-010` as `not_started`; they are reference only, archived, and not in the live wave)
- Current blocker: none
- Next action: `/factory-spec` on the first feature you add to `roadmap/phases.yaml`. The 10 legacy JOB cards in `inbox/` lack specs and are not in the active wave — do not start them with `/factory-implement`; re-spec them through `/factory-spec` first, or leave them as reference and start fresh.

## Sessions

### 2026-10-06 — session 0 (migration to spec/wave/ledger state model)

- Goal: switch Atrium from the single-`feature_list.json` model to the new spec/wave/ledger split
- Completed:
  - snapshotted `feature_list.json`, `progress.md`, `AGENTS.md`, and `inbox/` into
    `factory/archive/pre-migration/`
  - created `roadmap/phases.yaml` (empty), `specs/.gitkeep`,
    `factory/waves/wave-01.json` (empty wave), `factory/ledger/completed.jsonl`
    (header only), `factory/archive/progress/.gitkeep`
  - rewrote `AGENTS.md` for the seven-station loop (project content preserved;
    only the operating loop, layout, state map, and bans changed)
  - rewrote `progress.md` to this fresh stub
  - removed `feature_list.json` (its contents live in the pre-migration archive)
  - left `inbox/` as-is — those 10 job cards are reference only; they lack specs
    and are not in the active wave
- Verification run: not re-run; the verify command would build Next.js and was
  not invoked during the file migration
- Files touched: `AGENTS.md`, `progress.md`, `feature_list.json` (deleted),
  `roadmap/phases.yaml`, `specs/.gitkeep`, `factory/waves/wave-01.json`,
  `factory/ledger/completed.jsonl`, `factory/archive/pre-migration/`,
  `factory/archive/progress/.gitkeep`
- Still broken: the 10 legacy JOB cards in `inbox/` are not registered in
  `wave-01.json` and have no matching `specs/<id>-<slug>.md`; do not start them
  with `/factory-implement` until each is re-specced
- Next session should: add intent rows to `roadmap/phases.yaml`, then run
  `/factory-spec` on the first one

<!--
Rules for this file:
- Rewrite ONLY the "## Current Verified State" block above.
- Keep at most the last 3 session blocks inline. Move older ones to
  factory/archive/progress/session-NN-<date>.md via /factory-handoff.
- Record the exact command, its exit code, and a short output tail. No "should pass".
-->
