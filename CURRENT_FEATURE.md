# Current feature

**None in progress.** Phase 5 Workroom (5.1–5.7) is complete.

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

### 3.10 Playwright smoke (completed)

Unauthenticated `/rolodex` → login. Demo walks Today + five subnav sections and seed names; create person persists. Owner does not see demo seed names. Controller: npm test 344 passed; `npx playwright test` 18 passed. Spec PASS.

### Phase 4 Groove specs (written, not implemented)

Eight feature specs in `features/phase-4-groove/` (4.1–4.8): domain, shell, sequencer controls, transport/patches, audio engine, master, live wiring, Playwright smoke. Design: `docs/superpowers/specs/2026-09-09-groove-design.md`. No database.

### 4.1 Groove domain (completed)

Pure TypeScript in `lib/groove/`: types, music, DJ filter mapping, param specs, four Bench factory patches + `clonePatch`. No AudioContext, no Drizzle, `/groove` still Coming soon. Controller: npm test 380 passed, npm run build exit 0. Spec PASS.

### 4.2 Groove shell (completed)

`/groove` renders the desk: transport row (PLAY, active patch, BPM), four named unit regions from `UNIT_META` (RHYTHM DR-16, BASS MB-1, PADS PX-4, LEAD LX-2), master strip placeholder. CSS `groove-` prefix with `[data-theme="light"]` overrides. Atrium nav still wraps; auth redirect still works. Controller: npm test 383 passed, npm run build exit 0. Spec PASS.

### 4.3 Groove sequencer controls (completed)

`components/groove/`: `knob`, `fader`, `drum-grid`, `note-grid`, `velocity-lane`, `led-strip`, `unit`, `use-readout` ported from Bench. Each unit is `role="region"` named RHYTHM / BASS / PADS / LEAD; pads render `DrumGrid`, the others render `NoteGrid` + `VelocityLane`. Unique aria-labels (`KICK step 3`, `BASS step 1`, etc.) proven by both unit tests and a manual Chromium walk. Shell mounts four Units on a read-only `clonePatch(PATCHES[0])`. MUTE toggles a muted class. No AudioContext anywhere. Controller: npm test 421 passed, npm run build exit 0. Spec PASS.

### 4.4 Groove transport and patches (completed)

`components/groove/transport.tsx`: PLAY/STOP button, tempo dial with shift-fine, SWING knob, master LED strip, four patch buttons (A · NEON RIVIERA, B · BASALT, C · SUNROOM, D · LATE ORBIT), REVERT/SAVED toggle. `lib/groove/patch-edit.ts`: `setUnitParam`, `setNoteStep`, `setDrumStep`, `setBpm`, `setSwing`, `patchIsDirty`. Shell holds patches/index/mutes/playing state, edits via the helpers, listens for Space and 1–4 keys (ignored when typing into inputs). No AudioContext. Controller: npm test 430 passed, npm run build exit 0. Manual Chromium walk confirms all seven acceptance behaviours. Spec PASS.

### 4.5 Groove audio engine (completed)

`lib/groove/audio/`: `engine.ts` lookahead clock + scheduling, `drums.ts` six synthesised voices, `synths.ts` `MonoSynth` (bass/lead) + polyphonic `PadSynth`, `master.ts` bus with DJ filter, ping-pong delay, convolution reverb, sidechain duck, drum crush/drive; `schedule.ts` pure `gapToNext`/`sweepValue`. Shell constructs `Engine` on mount (browser only), writes live state into a ref every render, calls `resume()`+`start()` on PLAY and `stop()` on STOP. `onStep` drives the master LED strip. Knob SVG arcs rounded to 4dp so SSR and CSR match — no hydration warning. No AudioContext anywhere in tests, no npm audio library added. Controller: npm test 434 passed, npm run build exit 0. Headless Chromium walk: PLAY lights the playhead, 16 distinct steps accumulate over 2.5s, STOP returns playhead to -1, zero console errors. Spec PASS.

### 4.6 Groove master (completed)

`components/groove/master.tsx`: hero FILTER knob + sweep meter, the four `MASTER_GROUPS` (FILTER, SWEEP, SIDECHAIN, SEND FX) each rendering its Knobs, OUT volume Fader. `components/groove/scope.tsx`: canvas that draws the analyser spectrum and overlays `filterGainAt(macro, reso, freq)` so the readout matches the audio graph. Shell passes `engine.analyser` and `engine.filterMacro`/`sweepPhase` while playing; when stopped, the readout uses `patch.master.filter`. The 4.5 audio graph already had DJ filter + pump + delay + reverb + analyser; this PR adds the panel that drives it. Controller: npm test 444 passed, npm run build exit 0. Manual Chromium walk as demo: master strip visible, scope canvas mounted, four groups, LATE ORBIT renders an 8-segment sweep meter, zero console errors. Spec PASS.

### 4.7 Groove live wiring (completed)

Instrument edits land in the audio graph while the clock runs. The 4.5 engine already created `EngineState { patch, mutes, volume }` in a ref, called `applyParams` every tick, and exposed `auditionDrum`/`auditionNote`; 4.7 wires drum-step clicks to `auditionDrum(lane, value === 2)` when the new value is on. Patch switch mid-play needs no stop: `tick` reads the latest `stateRef` each step so BPM/filter/sends re-resolve. Engine is constructed only in the browser. Controller: npm test 446 passed, npm run build exit 0. Manual Chromium walk as demo: PLAY, switch to BASALT keeps transport in STOP (still playing) and changes BPM 112→130, drum click toggles+aouditions, STOP returns to PLAY. Spec PASS.

### 4.8 Playwright smoke (completed)

`e2e/groove.spec.ts`, ported from Bench `e2e/groove/instrument.spec.ts` with Atrium login (demo pair, owner fallback; skip if missing) and `groove-led`/`groove-master-leds` selectors — no component changes needed. Unauth `/groove` → login; four unit regions; transport start/stop with playhead −1 → lit → back; KICK step 3 aria-pressed toggle; BASS/PADS/LEAD step 1 each count 1; BASALT changes the BPM copy; RHYTHM MUTE toggles the muted class; MutationObserver-accumulated LED steps (≥12 of 16 in 10 s) prove the clock runs while the console stays error-free; transport stopped in afterEach. Controller: `npx playwright test e2e/groove.spec.ts` 8 passed, stable across repeated runs; `env -u DATABASE_URL npm test` 446 passed; `npm run build` exit 0; full suite 26 passed (two Rolodex subnav tests flaked once under full-suite load, both green on re-run — pre-existing, unrelated to Groove). Spec PASS.

### Phase 5 Workroom specs (written, not implemented)

Seven feature specs in `features/phase-5-workroom/` (5.1–5.7), plus a design amend to `docs/superpowers/specs/2026-09-06-atrium-design.md` folding in the Workroom prototype (`docs/prototypes/2026-09-10-workroom/`, PR #46). Warm editorial redesign: espresso surfaces, brass accent, Fraunces display + Geist body + Geist Mono data, light = paper, Groove stays instrument-dark. Foundation 5.1 (tokens, fonts, theme scaffold), chrome 5.2 (top nav, launcher, login, shared classes), per-app passes 5.3–5.6 (disjoint CSS modules, any order after 5.2), QA gate 5.7 (theme + no-console + namespace smoke). Preservation: `crm-`/`space-`/`rolodex-`/`groove-`/`atrium-nav-` namespaces stay; Groove keeps the Phase 4 unit and patch names (the prototype's Drum/Bass/Keys/Lead + BOOM BAP names are visual-only stand-ins). Docs-only PR; no implementation yet. Next implementable unit: 5.1.

### 5.1 Design system + theme scaffold (completed)

Workroom foundation. `app/globals.css` rewritten with the design tokens (espresso surfaces `--bg-0 #13100c`→`--bg-3 #2b251b`, warm ink, brass accent, warm-shifted data palette, geometry/shadows) and the matching `[data-theme="light"]` warm-paper overrides; body adopts the espresso surface + warm ink + `--font-sans`; fixed non-interactive paper-grain overlay + top brass glow; brass selection; `.reveal` stagger keyframed on `--i` with `prefers-reduced-motion` guard. `app/layout.tsx` loads Fraunces (`--font-fraunces`) via next/font alongside Geist/Geist Mono; type tokens map display/sans/mono. Kept `--background`/`--foreground` aliases so the existing CRM/Rolodex/Space modules keep resolving until their 5.3–5.6 passes. New source-grep test `app/globals.test.ts` locks the token values, light overrides, overlays, reveal, and the no-per-app-namespace guarantee. Verified: `npm test` 456 passed, `npm run build` exit 0, Chromium check shows dark `#13100c` / light `#ece5d6` with grain+glow and zero console errors, login+launcher+theme Playwright smokes 6 passed (first run failed from an empty `AUTH_SECRET` in `.env` — an env issue, not a regression; re-ran with `AUTH_SECRET=ci-build-placeholder`). Spec PASS.

### 5.2 Shared chrome, launcher, and login (completed)

Workroom chrome. `components/atrium-icon.tsx` adds stroked `currentColor` SVG glyphs (Home/CRM/Space/Rolodex/Groove, Theme, Refresh, Logout). `components/atrium-nav.module.css` + `atrium-nav.tsx` redesign the top nav into a sticky translucent-blur strip with the brass diamond brand (Fraunces "Atrium"), five SVG-glyph app links with brass active + underline sweep, the avatar-badge identity chip, and Theme/Reset/Logout surfaced as `atrium-btn` controls (Theme keeps aria-label "Toggle theme" so e2e still matches). `app/workroom.css` is the new shared `atrium-` presentational layer (btn/btn-primary, field, panel, label, chip, avatar, kpi, subnav/subtab, pagetitle/sub, appcard) loaded in the layout; launcher + login consume it and 5.3–5.6 will too. `app/(authenticated)/page.tsx` is four described app cards with inline SVG icons, `--app-glow` hover edge, and staggered `reveal`. Login gets the oversized brass "A" watermark, brand row/tagline, and `btn-primary` Sign in (fields keep Email/Password labels + the existing server action). Existing `.launcher-cards` globals removed. New source-grep test `app/workroom.test.ts` locks the shared class set, the five nav labels, SVG-not-emoji glyphs, and the login labels. Verified: `npm test` 464 passed, `npm run build` exit 0, `npx playwright test` 25/26 passed — the 2 Rolodex failures (demo subnav walk + create-person) reproduce **identically on clean `main`** (stashed & confirmed) and stem from slow `/rolodex` renders (~5 s) hitting the e2e 5 s nav timeout; they are pre-existing environment/DB-load flakes, not a 5.2 regression. Headless Chromium: espresso login, launcher brand+4 cards+`h1` Atrium, theme toggle works, zero console errors. Spec PASS.

### 5.3 CRM Workroom pass (completed)

All CRM screens re-skinned with the warm palette and shared `atrium-` classes; behaviour, TanStack, and recharts untouched. `crm-subnav.tsx` swaps unicode glyphs for inline SVG icons and uses the shared `atrium-subnav`/`atrium-subtab` (brass active underline); `dashboard-charts.tsx` re-themes recharts to brass/moss/slate/clay (keeps `isAnimationActive={false}` + the lib aggregation split; win-rate empty copy → "No closed deals yet"). `dashboard.module.css` restyles KPI tiles (top accent rule per tone, Fraunces figures, mono labels) and charts/feeds into Workroom panels; `stat-tile.tsx` adds a `--i` reveal stagger. `org.module.css` restyles tables/fields/dialogs/detail to token panels, fields, and `button[type=submit]` brass-primary (buttons styled via CRM-scoped descendants, no TSX churn); `pipeline-board.module.css` maps the six stages to the warm palette. All five CRM pages (`/crm` + orgs/contacts/deals/pipeline) wrap their titles in `atrium-pagetitle` with a mono sub. New source-grep test `components/crm/crm-pass.test.ts`. Verified: `npm test` 472 passed, `npm run build` exit 0, `e2e/crm.spec.ts` 4 passed, headless Chromium walk of all five CRM screens zero console errors (KPI values come straight from `lib/crm` dashboard/seed, matching the prototype's 4 / $130k / $66.5k). Spec PASS.

### 5.4 Space Workroom pass (completed)

Space re-skinned; page/block/row behaviour, TanStack, dnd, and autosave untouched. `lib/space/tree.ts` adds a `type` field to `PageTreeNode`; new `components/space/space-icons.tsx` (Doc/Database/Row glyphs) replaces the emoji tree/page icons in `sidebar-tree.tsx` and `[id]/page.tsx`. `space-shell.module.css` restyles the sidebar to a warm panel: Pages header + QuickFind, side-by-side New page/New db, SVG-glyph tree with brass current + hover-reveal row-actions (opacity reveal so Playwright stays clickable), and a `space-sidebar-footer` count. `editor.module.css` + `editor.tsx` add dragdot handles, a mono `space-editor-meta` line, and a real "Add a block — text, list, divider…" affordance wired to `addBlockAfter`, plus token block/quote/code/callout/slash-menu surfaces. QuickFind, database-table, database-views (table/list/filter chips), and board-view CSS restyled to token panels/chips/fields. New source-grep test `components/space/space-pass.test.ts`. Verified: `npm test` 478 passed, `npm run build` exit 0, `e2e/space.spec.ts` 4 passed (one initial failure from `display:none` row-actions → fixed to opacity reveal), headless Chromium walk: 73 sidebar links all SVG glyphs, zero emoji, editor shows 6 dragdots + add-block + meta, zero console errors. Spec PASS.

### 5.5 Rolodex Workroom pass (completed)

Rolodex re-skinned; people/cadence/import/timeline/date behaviour untouched. `rolodex-subnav.tsx` swaps unicode glyphs for inline SVG icons and uses the shared `atrium-subnav`/`atrium-subtab`; `rolodex-subnav.module.css` slimmed to the wrapper. Today (`rolodex/page.tsx` + `today-dashboard.tsx` + `today.module.css`) gets a `pagetitle`, four accent-keyed KPI tiles (clay overdue / brass due / moss dates+reminders) with Fraunces figures + `--i` reveal, and the who-to-contact rows restyled as contact-row cards (avatar, name+cadence, clay/brass due chips, brass `Log contact`); panels and charts become token panels. All five section pages wrap titles in `atrium-pagetitle` with a mono sub. `people.module.css`, `circles-board.module.css` (four circle accents), and `calendar-month.module.css` restyled to token panels/chips/avatars; `rolodex-status-*` classes preserved. New source-grep test `components/rolodex/rolodex-pass.test.ts`. Verified: `npm test` 485 passed, `npm run build` exit 0, `e2e/rolodex.spec.ts` 4 passed after two reliability fixes (raised the demo walk's too-tight 5 s nav/row timeouts to 15 s for the loaded dev DB, and a local **demo reset** to clear accumulated E2E person rows that pushed seed people below the fold — both pre-existing environment issues, not the redesign). Headless Chromium: 4 KPI tiles, 32 who-to-contact rows (avatar+chip+Log contact), 5 subnav SVG icons, zero console errors across all five pages. Spec PASS.

### 5.7 Theming QA + smoke (completed)

Phase 5 closes with two gates, both built to bite. `e2e/workroom.spec.ts`: the login screen is themed (shared `atrium-field`/`atrium-btn-primary` reach it, surface is a Workroom token, not white or black); dark is espresso `rgb(19,16,12)` and light is paper `rgb(236,229,214)` through the toggle **and** across a reload with `atrium.theme` in localStorage; Groove keeps its instrument tokens on a paper page (`--inst-panel #1a1510`, `--inst-ink #f4ecdc` under `data-theme="light"`); a **link-walk** asserts every top-nav tab (Home/CRM/Space/Rolodex/Groove), every CRM subnav tab, every Rolodex subnav tab, and a Space sidebar page link carries the expected `href` _and_ lands on that route; and a 13-screen no-console walk (per-route `main` + h1, Groove transport stopped in `finally`). `tests/workroom-namespace.test.ts` (13 tests) reads the real import graph: each app's `*.module.css` is imported only from its own `components/<app>/` or `app/(authenticated)/<app>/` tree, the shared `atrium-` module only from the shared layer, no orphaned stylesheet, no per-app module redefining a shared `.atrium-*` class (comments stripped), the 5.6 pitfall generalized into a rule (a file with bare class names must be imported as `styles[...]`; a side-effect import may only name `:global` classes), both themes declaring the full colour-token set, both chart components painting only from the warm data palette, and no retired `#0a0a0a`/`#171717`/`#ededed`/`#ffffff` anywhere in app code. **All three gates were verified by injecting the defect they exist to catch**: `href="#"` on the CRM Contacts tab failed with `Expected "/crm/contacts" Received "#"`, a `console.error` in `atrium-nav` failed the console walk, and `#2563eb` in `today-charts.tsx` failed the palette gate — each reverted immediately. Two consistency fixes landed here because their owning passes were already merged: `components/rolodex/today-charts.tsx` swapped five stock series colours (`#16a34a`/`#d97706`/`#dc2626`/`#64748b`/`#2563eb`) for the warm data tokens (moss/brass/clay/slate/violet) matching the same page's chips and the CRM charts; and `e2e/rolodex.spec.ts`'s demo walk got a 90 s per-test ceiling (it runs 33 s once the full suite is loaded, past Playwright's 30 s default — the pre-existing "Rolodex flake" was a budget problem, not a failing assertion). Controller: `npm test` 510 passed (89 files), `npm run build` exit 0, `npx playwright test` **31 passed** (was 26). Spec PASS.
