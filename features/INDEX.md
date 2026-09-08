# Atrium — Feature Index

Board for phases and features. Status here is the source of truth for what is done.
Cold start: [HANDOFF.md](../HANDOFF.md)
Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](../docs/superpowers/specs/2026-09-06-atrium-design.md)
In progress: [CURRENT_FEATURE.md](../CURRENT_FEATURE.md)

Only one feature `in_progress`. Later phases get specs when that phase starts.

## Build order

Critical path: 0.1 → … → 0.5 → 1.1 → … → 1.9 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.8.
2.7 (search) starts after 2.5 and must not run in parallel with 2.6 if they share the database page.
Phase 2 is sequential. Do not run two Space features in parallel.

### Phase 0 — Atrium platform

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| 0.1 | [Next.js scaffold + AGENTS.md + CI](./phase-0-platform/0.1-next-scaffold.md) | completed | nothing |
| 0.2 | [Drizzle + Neon users and tenants](./phase-0-platform/0.2-drizzle-neon-users.md) | completed | 0.1 |
| 0.3 | [Auth.js credentials login](./phase-0-platform/0.3-authjs-credentials.md) | completed | 0.2 |
| 0.4 | [Nav, theme, launcher](./phase-0-platform/0.4-nav-theme-launcher.md) | completed | 0.3 |
| 0.5 | [Tenancy helper + Reset demo](./phase-0-platform/0.5-tenancy-demo-reset.md) | completed | 0.4 |

### Phase 1 — CRM

Jobs-to-be-done from Bench `docs/crm/`. Tenant-scoped. Demo seed. Not pixel-identical, not Express/SQLite.

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| 1.1 | [Schema, seed, demo resetter](./phase-1-crm/1.1-schema-seed-resetter.md) | completed | 0.5 |
| 1.2 | [CRM shell and subnav](./phase-1-crm/1.2-crm-shell.md) | completed | 1.1 |
| 1.3 | [Organizations table and detail](./phase-1-crm/1.3-organizations.md) | completed | 1.1, 1.2 |
| 1.4 | [Contacts table and detail](./phase-1-crm/1.4-contacts.md) | completed | 1.3 |
| 1.5 | [Deals table](./phase-1-crm/1.5-deals.md) | completed | 1.4 |
| 1.6 | [Pipeline board](./phase-1-crm/1.6-pipeline.md) | completed | 1.5 |
| 1.7 | [Activities and follow-ups](./phase-1-crm/1.7-activities.md) | completed | 1.4, 1.5 |
| 1.8 | [Dashboard](./phase-1-crm/1.8-dashboard.md) | completed | 1.6, 1.7 |
| 1.9 | [Playwright smoke](./phase-1-crm/1.9-playwright-smoke.md) | completed | 1.8 |

Long pole: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.8 → 1.9. 1.7 can start after 1.5 (same files as deal/contact detail — do not parallel with 1.5).

### Phase 2 — Space

Jobs-to-be-done from Bench `docs/space/`. Tenant-scoped. Demo seed. Not pixel-identical, not Express/SQLite.

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| 2.1 | [Schema, seed, demo resetter](./phase-2-space/2.1-schema-seed-resetter.md) | pending | 0.5 |
| 2.2 | [Space shell](./phase-2-space/2.2-space-shell.md) | pending | 2.1 |
| 2.3 | [Pages tree in the sidebar](./phase-2-space/2.3-pages-sidebar.md) | pending | 2.1, 2.2 |
| 2.4 | [Block editor](./phase-2-space/2.4-block-editor.md) | pending | 2.3 |
| 2.5 | [Databases and table view](./phase-2-space/2.5-databases-table.md) | pending | 2.3, 2.4 |
| 2.6 | [Board, list, filters, sorts](./phase-2-space/2.6-views-board-list.md) | pending | 2.5 |
| 2.7 | [Quick-find search](./phase-2-space/2.7-search.md) | pending | 2.5 |
| 2.8 | [Playwright smoke](./phase-2-space/2.8-playwright-smoke.md) | pending | 2.6, 2.7 |

Long pole: 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.8. 2.7 can start after 2.5 (same database page as 2.6 — do not parallel).

### Phase 3 — Rolodex

Specs not written yet.

### Phase 4 — Groove

Specs not written yet.
