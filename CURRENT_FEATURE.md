# Current feature

**None in progress.**

Next up: [3.10 Playwright smoke](features/phase-3-rolodex/3.10-playwright-smoke.md)

Do not invent Groove specs.

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

### 1.7 Activities and follow-ups (completed)

Note/call/email from contact and deal detail. Timeline newest first. Optional due date and boolean done toggle, tenant-scoped. Controller: npm test 155 passed. Spec PASS, quality APPROVED.

### 1.8 Dashboard (completed)

`/crm` tiles, recharts (animation off), recent activity, overdue/upcoming follow-ups. Aggregations in `lib/crm/dashboard.ts` (trailing 6-month wins, cumulative funnel, tenant-scoped). Controller: npm test 168 passed. Spec PASS, quality APPROVED.

### 1.9 Playwright smoke (completed)

`e2e/crm.spec.ts`: unauth `/crm` → login; demo dashboard + subnav + seed orgs; create org persists; owner does not see demo seed names. Controller: npm test 168, Playwright 10 passed. Spec PASS, quality APPROVED.

### Phase 2 Space specs (written, not implemented)

Eight feature specs in `features/phase-2-space/` (2.1–2.8): schema/seed/resetter, shell, pages tree, block editor, databases/table, board/list/filters, search, Playwright smoke. Next implementable unit is 2.6.

### 2.1 Space schema, seed, resetter (completed)

Drizzle tables pages/blocks/properties/propertyOptions/rowValues/views with tenantId, UUID ids, cascade FKs. Query helpers require tenantId (memory + Drizzle). Demo seed is a nested Bench page tree with icons; owner empty. Reset demo registers Space wipe+reseed. Migration `drizzle/0002_panoramic_smasher.sql`. `/space` still Coming soon. Controller: npm test 188 passed, npm run build exit 0. Spec PASS.

### 2.2 Space shell (completed)

Sidebar + page columns under `app/(authenticated)/space/`. Landing is “Pick a page”; `/space/[id]` is a placeholder body. Space CSS is `space-` prefixed and imported only from Space files. Atrium nav still wraps. No page tree yet (2.3). Controller: npm test 197 passed, build lists `/space` and `/space/[id]`. Spec PASS.

### 2.3 Pages tree in the sidebar (completed)

Session-scoped page actions; sidebar tree omits `row` pages. Create navigates to the new id then refreshes. Rename/delete from the tree; parent delete cascades after confirm. `/space/[id]` 404s for missing/other-tenant. `/space` redirects to the first tree page. Controller: npm test 207 passed, npm run build exit 0. Spec PASS.

### 2.4 Block editor (completed)

Vanilla per-block editor (textarea, no extra editor library). Slash menu (`/`) filters by keyboard and mouse. Autosave, Enter/Backspace, todo checkbox, drag reorder via `@hello-pangea/dnd`. Demo Home seed includes every block type. Controller: npm test 213 passed, npm run build exit 0. Spec PASS.

### 2.5 Databases and table view (completed)

Database pages in the sidebar; TanStack table with in-place editors for seven property types; rows open as properties + block editor. Demo seed: Trip Planner (5 rows) and Reading List. Controller: npm test 219 passed, npm run build exit 0. Spec PASS.

### 2.6 Board, list, filters, and sorts (completed)

Table/board/list switcher. Filters and sort persist per view. Board drag (dnd-kit) updates the grouping select. List shows title + a property. Controller: npm test 246 passed. Spec PASS, quality APPROVED.

### 2.7 Quick-find search (completed)

Sidebar Search + ⌘/Ctrl+K. Title search across pages, databases, and rows. Session tenant only. Controller: npm test 254 passed. Spec PASS, quality APPROVED.

### 2.8 Playwright smoke (completed)

`e2e/space.spec.ts`: unauth `/space` → login; demo Home/Projects/Travel; New database Table; create/rename page persists; owner does not see demo titles. Controller: npm test 254, Playwright 14 passed. Spec PASS, quality APPROVED.

### Phase 3 Rolodex specs (written, not implemented)

Ten feature specs in `features/phase-3-rolodex/` (3.1–3.10): schema/seed/resetter, shell, people, import, circles, log/timeline, dates/calendar, gifts/connections, Today, Playwright smoke. Design: `docs/superpowers/specs/2026-09-09-rolodex-design.md`. Initials only (no photo column). Next implementable unit is 3.1.

### 3.1 Rolodex schema, seed, resetter (completed)

Drizzle tables people/interactions/importantDates/facts/news/reminders/gifts/connections with tenantId, UUID ids, cascade FKs. Query helpers require tenantId (memory + Drizzle). Cadence and annual-date helpers match Bench. Demo seed ≥30 people across every circle; owner empty. Reset demo registers Rolodex wipe+reseed. Migration `drizzle/0003_dapper_shinobi_shaw.sql`. `/rolodex` still Coming soon. Controller: npm test 294 passed, npm run build exit 0. Spec PASS.

### 3.2 Rolodex shell and subnav (completed)

Five-section Rolodex subnav (Today, People, Circles, Calendar, Timeline) under `app/(authenticated)/rolodex/`. Today is `/rolodex`. Current section amber + glyphs. Rolodex CSS is `rolodex-` prefixed and imported only from Rolodex files. Atrium nav still wraps. Controller: npm test 299 passed, build lists the five Rolodex routes. Spec PASS.

### 3.3 People table and person page (completed)

TanStack people table with initials, search (name/company/email), circle and tag filters, add/edit dialog, confirm delete. Session tenant only. Detail `/rolodex/people/[id]` 404s for missing/other-tenant. Controller: npm test 307 passed, build includes `/rolodex/people/[id]`. Spec PASS.

### 3.4 CSV and vCard import (completed)

Papa Parse + vcf. Column mapping, preview, duplicates flagged by email then name and untickable. Apply is all-or-nothing on the memory repo; neon-http is sequential writes. Birthday mapping creates an important date. Controller: npm test 316 passed. Spec PASS.

### 3.5 Circles board, cadence, snooze (completed)

Four-column `@hello-pangea/dnd` board. Drag changes circle via `movePersonCircle`. Header counts people and overdue. Cadence off/snooze covered in unit tests; person page Edit exposes those fields. Controller: npm test 322 passed. Spec PASS.

### 3.6 Interactions, facts, news, reminders, and Timeline (completed)

Person page logs interactions/facts/news/reminders. Last contacted and latest news stay derived. Global `/rolodex/timeline` filters by person and type. Reminder done uses `doneAt`. Controller: npm test 327 passed. Spec PASS.

### 3.7 Important dates and calendar (completed)

Person page add/edit/delete dates with age and milestone. Month grid with prev/next across years; 29 Feb → 28 in common years; click opens the person. Controller: npm test 329 passed. Spec PASS.

### 3.8 Gifts and connections (completed)

Person page gifts (idea/given/received); outstanding ideas surface when a date is within 30 days. Two-sided connections with inverse parent/child labels; picker is tenant-scoped. Delete person cascades connections. Controller: npm test 335 passed. Spec PASS.

### 3.9 Today dashboard (completed)

`/rolodex` is Today: who-to-contact (most overdue first, one-click log), dates in 30 days, due reminders, recent activity, two recharts series from lib aggregations. Empty panels keep copy. Controller: npm test 344 passed. Spec PASS.
