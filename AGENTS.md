# Atrium agent rules

Stack: Next.js App Router, Neon Postgres, Drizzle. No Express. No SQLite.

Do not query the database without `tenantId` from the session. Never take tenant id from the request body or query string.

Keep CSS scoped per app. Shared nav classes use the `atrium-nav-` prefix and do not rely on app theme variables.

Write tests first (TDD). Implement one feature at a time.

Do not add Tailwind, shadcn, TanStack Router, or TanStack Query unless a feature spec says so. TanStack Table is allowed only in CRM/Space table features.

Follow `features/INDEX.md` and `CURRENT_FEATURE.md`. Do not start the next feature while one is in progress.
