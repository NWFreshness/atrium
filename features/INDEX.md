# Atrium — Feature Index

Board for phases and features. Status here is the source of truth for what is done.
Cold start: [HANDOFF.md](../HANDOFF.md)
Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](../docs/superpowers/specs/2026-09-06-atrium-design.md)
Rolodex: [docs/superpowers/specs/2026-09-09-rolodex-design.md](../docs/superpowers/specs/2026-09-09-rolodex-design.md)
Groove: [docs/superpowers/specs/2026-09-09-groove-design.md](../docs/superpowers/specs/2026-09-09-groove-design.md)
In progress: [CURRENT_FEATURE.md](../CURRENT_FEATURE.md)

Only one feature `in_progress`. Later phases get specs when that phase starts.

## Build order

Critical path: 0.1 → … → 0.5 → 1.1 → … → 1.9 → 2.1 → … → 2.8 → 3.1 → 3.2 → 3.3 → 3.5 → 3.9 → 3.10 → 4.1 → … → 4.8 → 5.1 → 5.2 → 5.7.
3.4 / 3.6 / 3.7 start after 3.3 (same person page — do not parallel). 3.8 after 3.7.
Phase 3 is sequential. Phase 4 is sequential. Do not run two Groove features in parallel.
Phase 5 is sequential through 5.2 and the QA gate 5.7; the per-app passes 5.3–5.6 may run in any order after 5.2 (disjoint CSS module sets), but must all land before 5.7.

### Phase 0 — Atrium platform

| ID  | Feature                                                                          | Status    | Depends on |
| --- | -------------------------------------------------------------------------------- | --------- | ---------- |
| 0.1 | [Next.js scaffold + AGENTS.md + CI](./phase-0-platform/0.1-next-scaffold.md)     | completed | nothing    |
| 0.2 | [Drizzle + Neon users and tenants](./phase-0-platform/0.2-drizzle-neon-users.md) | completed | 0.1        |
| 0.3 | [Auth.js credentials login](./phase-0-platform/0.3-authjs-credentials.md)        | completed | 0.2        |
| 0.4 | [Nav, theme, launcher](./phase-0-platform/0.4-nav-theme-launcher.md)             | completed | 0.3        |
| 0.5 | [Tenancy helper + Reset demo](./phase-0-platform/0.5-tenancy-demo-reset.md)      | completed | 0.4        |

### Phase 1 — CRM

Jobs-to-be-done from the reference `docs/crm/`. Tenant-scoped. Demo seed. Not pixel-identical, not Express/SQLite.

| ID  | Feature                                                                  | Status    | Depends on |
| --- | ------------------------------------------------------------------------ | --------- | ---------- |
| 1.1 | [Schema, seed, demo resetter](./phase-1-crm/1.1-schema-seed-resetter.md) | completed | 0.5        |
| 1.2 | [CRM shell and subnav](./phase-1-crm/1.2-crm-shell.md)                   | completed | 1.1        |
| 1.3 | [Organizations table and detail](./phase-1-crm/1.3-organizations.md)     | completed | 1.1, 1.2   |
| 1.4 | [Contacts table and detail](./phase-1-crm/1.4-contacts.md)               | completed | 1.3        |
| 1.5 | [Deals table](./phase-1-crm/1.5-deals.md)                                | completed | 1.4        |
| 1.6 | [Pipeline board](./phase-1-crm/1.6-pipeline.md)                          | completed | 1.5        |
| 1.7 | [Activities and follow-ups](./phase-1-crm/1.7-activities.md)             | completed | 1.4, 1.5   |
| 1.8 | [Dashboard](./phase-1-crm/1.8-dashboard.md)                              | completed | 1.6, 1.7   |
| 1.9 | [Playwright smoke](./phase-1-crm/1.9-playwright-smoke.md)                | completed | 1.8        |

Long pole: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.8 → 1.9. 1.7 can start after 1.5 (same files as deal/contact detail — do not parallel with 1.5).

### Phase 2 — Space

Jobs-to-be-done from the reference `docs/space/`. Tenant-scoped. Demo seed. Not pixel-identical, not Express/SQLite.

| ID  | Feature                                                                    | Status    | Depends on |
| --- | -------------------------------------------------------------------------- | --------- | ---------- |
| 2.1 | [Schema, seed, demo resetter](./phase-2-space/2.1-schema-seed-resetter.md) | completed | 0.5        |
| 2.2 | [Space shell](./phase-2-space/2.2-space-shell.md)                          | completed | 2.1        |
| 2.3 | [Pages tree in the sidebar](./phase-2-space/2.3-pages-sidebar.md)          | completed | 2.1, 2.2   |
| 2.4 | [Block editor](./phase-2-space/2.4-block-editor.md)                        | completed | 2.3        |
| 2.5 | [Databases and table view](./phase-2-space/2.5-databases-table.md)         | completed | 2.3, 2.4   |
| 2.6 | [Board, list, filters, sorts](./phase-2-space/2.6-views-board-list.md)     | completed | 2.5        |
| 2.7 | [Quick-find search](./phase-2-space/2.7-search.md)                         | completed | 2.5        |
| 2.8 | [Playwright smoke](./phase-2-space/2.8-playwright-smoke.md)                | completed | 2.6, 2.7   |

Long pole: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.8. 2.7 can start after 2.5 (same database page as 2.6 — do not parallel).

### Phase 3 — Rolodex

Jobs-to-be-done from the reference `docs/rolodex/`. Tenant-scoped. Demo seed. Not pixel-identical, not Express/SQLite. Initials only (no photo column). Design: [2026-09-09-rolodex-design.md](../docs/superpowers/specs/2026-09-09-rolodex-design.md).

| ID   | Feature                                                                        | Status    | Depends on    |
| ---- | ------------------------------------------------------------------------------ | --------- | ------------- |
| 3.1  | [Schema, seed, demo resetter](./phase-3-rolodex/3.1-schema-seed-resetter.md)   | completed | 0.5           |
| 3.2  | [Rolodex shell and subnav](./phase-3-rolodex/3.2-rolodex-shell.md)             | completed | 3.1           |
| 3.3  | [People table and person page](./phase-3-rolodex/3.3-people.md)                | completed | 3.1, 3.2      |
| 3.4  | [CSV and vCard import](./phase-3-rolodex/3.4-import.md)                        | completed | 3.3           |
| 3.5  | [Circles board, cadence, snooze](./phase-3-rolodex/3.5-circles.md)             | completed | 3.3           |
| 3.6  | [Log, facts, news, reminders, Timeline](./phase-3-rolodex/3.6-log-timeline.md) | completed | 3.3           |
| 3.7  | [Important dates and calendar](./phase-3-rolodex/3.7-dates-calendar.md)        | completed | 3.3           |
| 3.8  | [Gifts and connections](./phase-3-rolodex/3.8-gifts-connections.md)            | completed | 3.3, 3.7      |
| 3.9  | [Today dashboard](./phase-3-rolodex/3.9-today.md)                              | completed | 3.5, 3.6, 3.7 |
| 3.10 | [Playwright smoke](./phase-3-rolodex/3.10-playwright-smoke.md)                 | completed | 3.9           |

Long pole: 3.1 → 3.2 → 3.3 → 3.5 → 3.9 → 3.10. 3.4, 3.6, 3.7 can start after 3.3 (same person page — do not parallel).

### Phase 4 — Groove

Jobs-to-be-done from the reference `docs/groove/`. Web Audio only. No database, no seed, no tenant rows. Still behind login. Design: [2026-09-09-groove-design.md](../docs/superpowers/specs/2026-09-09-groove-design.md).

| ID  | Feature                                                                         | Status    | Depends on |
| --- | ------------------------------------------------------------------------------- | --------- | ---------- |
| 4.1 | [Domain: types, music, filter, params, patches](./phase-4-groove/4.1-domain.md) | completed | 0.4        |
| 4.2 | [Shell and hardware layout](./phase-4-groove/4.2-shell.md)                      | completed | 4.1        |
| 4.3 | [Knobs, faders, sequencer grids](./phase-4-groove/4.3-sequencer-controls.md)    | completed | 4.1, 4.2   |
| 4.4 | [Transport, patches, mute, keyboard](./phase-4-groove/4.4-transport-patches.md) | completed | 4.3        |
| 4.5 | [Audio engine](./phase-4-groove/4.5-audio-engine.md)                            | completed | 4.1, 4.4   |
| 4.6 | [Master filter, sweep, pump, FX, scope](./phase-4-groove/4.6-master.md)         | completed | 4.5        |
| 4.7 | [Live wiring](./phase-4-groove/4.7-live-wiring.md)                              | completed | 4.5, 4.6   |
| 4.8 | [Playwright smoke](./phase-4-groove/4.8-playwright-smoke.md)                    | completed | 4.7        |

Long pole: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.8. Do not parallel any two Groove features. Do not add Groove tables.

### Phase 5 — Workroom (redesign)

Visual redesign of the whole product. Warm editorial ("The Workroom"): espresso surfaces, brass accent, Fraunces display + Geist Mono data, light = paper. No new domains or databases; re-theme only. Details: [design amend](../docs/superpowers/specs/2026-09-06-atrium-design.md) + prototype [docs/prototypes/2026-09-10-workroom/](../docs/prototypes/2026-09-10-workroom/README.md). Phase 5 complete (5.1–5.7).

| ID  | Feature                                                                                  | Status    | Depends on |
| --- | ---------------------------------------------------------------------------------------- | --------- | ---------- |
| 5.1 | [Design system + theme scaffold](./phase-5-workroom/5.1-design-system-theme-scaffold.md) | completed | nothing    |
| 5.2 | [Shared chrome, launcher, login](./phase-5-workroom/5.2-shared-chrome-launcher-login.md) | completed | 5.1        |
| 5.3 | [CRM pass](./phase-5-workroom/5.3-crm-pass.md)                                           | completed | 5.2        |
| 5.4 | [Space pass](./phase-5-workroom/5.4-space-pass.md)                                       | completed | 5.2        |
| 5.5 | [Rolodex pass](./phase-5-workroom/5.5-rolodex-pass.md)                                   | completed | 5.2        |
| 5.6 | [Groove pass](./phase-5-workroom/5.6-groove-pass.md)                                     | completed | 5.2        |
| 5.7 | [Theming QA + smoke](./phase-5-workroom/5.7-theming-qa-smoke.md)                         | completed | 5.3–5.6    |

Long pole: 5.1 → 5.2 → 5.7. 5.3–5.6 may run in any order after 5.2 (disjoint CSS module sets) but all must land before 5.7. Do not parallel two features that touch the same files. Preserve `crm-`/`space-`/`rolodex-`/`groove-`/`atrium-nav-` namespaces.
