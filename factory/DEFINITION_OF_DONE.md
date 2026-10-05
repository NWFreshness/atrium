# Definition of Done

A feature is `passing` only when **all four** are true:

1. **The target behavior exists in the repo.** Not "the code was written" — the observable
   thing the job card's `Acceptance criteria` describe actually happens.
2. **The named verify command actually ran in this session.** Its `verify` field in
   `feature_list.json` — not a weaker substitute, not "would have run". For this repo that is
   `env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build`.
3. **Evidence is written in `progress.md` AND `feature_list.json`.** The exact command, the
   exit code, and a short output tail. Evidence is never `implemented X` or `looks good`.
4. **The repo is restartable from `AGENTS.md` + `progress.md` with no chat history.** A fresh
   Hermes session reading only those two files must know what state the work is in.

## Passing requires factory-verify evidence

Only `/factory-verify` may set `status=passing`, and only after a real command ran in that
same session and exited 0. No other station, no matter how complete the work looks, may set
it. `/factory-implement` may run the command for information and still must not mark
passing.

If the verify command exits 0 but the acceptance criteria are obviously unmet, the feature is
**not** passing. Set `blockedReason` to `verify green but acceptance unmet` and hand back to
`/factory-implement`.


## Status vocabulary

`not_started` | `in_progress` | `blocked` | `passing` | `rejected`

At most one feature may be `in_progress`. Every `passing` feature carries non-empty evidence.
