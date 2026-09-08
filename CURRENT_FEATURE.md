# Current feature

**None in progress.**

Next up: [1.7 Activities and follow-ups](features/phase-1-crm/1.7-activities.md)

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

### Phase 1 CRM specs (written, not implemented)

Nine feature specs in `features/phase-1-crm/` (1.1–1.9): schema/seed/resetter, shell, orgs, contacts, deals, pipeline, activities, dashboard, Playwright smoke. Next implementable unit is 1.1.

### 1.1 CRM schema, seed, resetter (completed)

Drizzle tables organizations/contacts/deals/activities with tenantId, UUID ids, SET NULL FKs. Query helpers require tenantId (memory + Drizzle). STAGE_PROBABILITY and expectedValue match Bench. Demo seed (Northwind, Bluepeak, Harbor & Lane) is idempotent; owner empty. Reset demo registers CRM wipe+reseed. Migration `drizzle/0001_light_saracen.sql`. `/crm` still Coming soon. Controller: npm test 78 passed, npm run build exit 0. Spec PASS, quality APPROVED.

### 1.2 CRM shell and subnav (completed)

Five-section CRM subnav (Dashboard, Organizations, Contacts, Deals, Pipeline) under `app/(authenticated)/crm/`. Dashboard is `/crm`. Current section amber + glyphs. CRM CSS is `crm-` prefixed and imported only from the CRM layout. Atrium nav still wraps. No TanStack. Controller: npm test 85 passed, npm run build lists the five CRM routes. Spec PASS, quality APPROVED.

### 1.3 Organizations table and detail (completed)

TanStack Table list with search (name/website/industry), add/edit dialog, confirm delete. Session tenant only. Detail `/crm/organizations/[id]` 404s for missing/other-tenant. Controller: npm test 92 passed, build includes `/crm/organizations/[id]`. Spec PASS, quality APPROVED.

### 1.4 Contacts table and detail (completed)

TanStack contacts table with search (name/email/job title), status filter, add/edit dialog, org select limited to session tenant. Detail shows org link. Org detail lists contacts. Controller: npm test 103 passed, build includes `/crm/contacts/[id]`. Spec PASS, quality APPROVED.

### 1.5 Deals table (completed)

TanStack deals table with stage, USD value, close date, org, contact. Search by deal/org/contact name. Default probability from STAGE_PROBABILITY; stage change rebases unless probability is explicit. Org and contact details list related deals. No pipeline dnd. Controller: npm test 127 passed, build includes `/crm/deals/[id]`. Spec PASS, quality APPROVED.

### 1.6 Pipeline board (completed)

Six-column `@hello-pangea/dnd` board. Drag to stage persists via `moveDeal`; stage change rebases probability; same-column reorder does not. Open pipeline totals exclude Won/Lost. Controller: npm test 145 passed, build includes `/crm/pipeline`. Spec PASS, quality APPROVED.
