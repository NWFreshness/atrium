# Atrium agent rules

Stack: Next.js App Router, Neon Postgres, Drizzle. No Express. No SQLite.

All SQL goes through Drizzle in `lib/db`.

Do not query the database without `tenantId` from the session. Never take tenant id from the request body or query string.

Keep CSS scoped per app. Shared nav classes use the `atrium-nav-` prefix and do not rely on app theme variables. App prefixes: `crm-`, `space-`, `rolodex-`, `groove-`.

Groove never hits the database. Do not add Groove tables or a Groove demo resetter. Web Audio only; import the engine from client components only.

Write tests first (TDD). Implement one feature at a time.

Do not add Tailwind, shadcn, TanStack Router, or TanStack Query unless a feature spec says so. TanStack Table is allowed only in CRM/Space table features.

Follow `features/INDEX.md` and `CURRENT_FEATURE.md`. Do not start the next feature while one is in progress.

Ship on a feature branch and a GitHub PR. Never push commits to `main`. Do not merge unless the user asks.

Use subagent-driven-development when implementing a feature spec: implementer, then spec-compliance review, then quality review. The controller re-runs `npm test` and `npm run build`; do not trust a subagent “tests passed” report.

Cold start: `HANDOFF.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
