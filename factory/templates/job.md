# JOB-NNN — <short imperative title>

<!-- NNN = next number after the existing inbox/JOB-*.md files. Keep the slug short. -->

## Goal

<!-- One sentence. What observable thing becomes true. Not a task list. -->

## Scope paths

<!-- Exact paths or directories this job may create or modify. One per line, repo-relative.
     A vague entry here ("the backend", "as needed") makes the job invalid. -->

## Out of scope

<!-- Paths and behaviors this job must not touch. Name them explicitly, including the
     tempting ones a future session might "helpfully" change. -->

## Acceptance criteria

<!-- Observable behavior, numbered and checkable. "User can X and the response contains Y"
     beats "code is clean". Each item must be provable by the verify command. -->

1.
2.

## Verify command

<!-- The exact command run from the repo root that proves this job. It must already exist in
     AGENTS.md or factory/scripts/verify.sh — unless this job's goal IS to add it. Never
     invent a command that always succeeds. For this repo the default is
     `env -u DATABASE_URL npm test && AUTH_SECRET=ci-build-placeholder npm run build`.
     A Playwright job names `npx playwright test <spec>` instead. -->

```

## Done evidence

<!-- Empty until /factory-verify runs. Fill with: command, exit code, short output tail,
     timestamp. Never "implemented" or "looks good". -->

## Notes

<!-- Constraints discovered mid-job, extra files added to scope, review findings,
     deviations from the original plan. Reason and date. -->
