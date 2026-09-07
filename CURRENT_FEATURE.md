# Current feature

**None in progress.**

Next up: Phase 1 CRM specs (not written). Do not invent them.

---

## Log

### 0.1 Next.js scaffold + AGENTS.md + CI (completed)

Shipped a Next.js 16 App Router app at the repo root (no `src/`, no Tailwind). Vitest smoke test, GitHub Actions (Node 22: npm ci, test, build), AGENTS.md, and `.env.example` names only. Home page is a placeholder heading “Atrium”. Controller verified `npm test` and `npm run build` exit 0. Spec PASS, quality APPROVED.

### 0.2 Drizzle + Neon users and tenants (completed)

Drizzle schema for tenants, users (owner|demo), Auth.js accounts/sessions/verificationTokens. bcryptjs hashing. Idempotent seed helpers tested without a live DB. Generated migration `drizzle/0000_parched_xavin.sql`. Scripts: db:generate, db:migrate, db:seed (loads .env). Controller: npm test and npm run build exit 0. Spec PASS, quality APPROVED. Dev Neon branch was migrated and seeded locally (gitignored `.env`). Production still needs the same migrate against the Vercel/prod URL; do not copy data from dev.

### 0.3 Auth.js credentials login (completed)

next-auth Credentials + JWT. Unauthenticated `/` → `/login`. Generic invalid credentials error. Owner and demo can sign in. Logout returns to `/login`. Session carries id, email, tenantId, role. Playwright login spec. CI e2e job skips without secrets. Controller: npm test and npm run build exit 0. Spec PASS, quality APPROVED.

### 0.4 Nav, theme, launcher (completed)

Authenticated route group with launcher at `/` (four cards: CRM, Space, Rolodex, Groove) and Coming-soon placeholders. Shared `atrium-nav` strip (Home + four apps, amber current + glyphs, email, theme toggle, Logout). `data-theme` on `<html>`, `atrium.theme` in localStorage, inline init script before paint, first visit follows OS. Nav CSS is `atrium-nav-` prefixed literals. Playwright: launcher cards + theme survives reload. CI e2e runs full Playwright suite. `allowedDevOrigins: ["127.0.0.1"]` so Playwright on 127.0.0.1 hydrates. Controller: npm test 41 passed, npm run build exit 0, npx playwright test 6 passed. Spec PASS, quality APPROVED. No Reset demo (0.5).

### 0.5 Tenancy helper + Reset demo (completed)

`requireTenant()` returns `{ userId, tenantId, role }` from the Auth.js session only (client tenantId ignored). `resetDemo` throws for owner without running resetters; demo succeeds with an empty resetter registry. Thrown resetter + injected transaction rolls back. `registerDemoResetter` is the phase-1 hook. Nav shows “Reset demo” only when `role === demo`. Server action calls `resetDemo(() => auth())` with no client extra. No CRM/Space/Rolodex tables. Controller: npm test 53 passed, npm run build exit 0. Spec PASS, quality APPROVED. AGENTS.md already forbids tenantId from body/query; extra requireTenant sentence was blocked by the instruction-file write gate.
