# Atrium — Feature Index

Board for phases and features. Status here is the source of truth for what is done.
Cold start: [HANDOFF.md](../HANDOFF.md)
Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](../docs/superpowers/specs/2026-09-06-atrium-design.md)
In progress: [CURRENT_FEATURE.md](../CURRENT_FEATURE.md)

Only one feature `in_progress`. Later phases get specs when that phase starts.

## Build order

Critical path: 0.1 → … → 0.5 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.8 → 1.9.
1.7 (activities) starts after 1.5 and must not run in parallel with 1.5–1.6 (shared contact/deal detail files).
Phase 1 is sequential. Do not run two CRM features in parallel.

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
| 1.4 | [Contacts table and detail](./phase-1-crm/1.4-contacts.md) | pending | 1.3 |
| 1.5 | [Deals table](./phase-1-crm/1.5-deals.md) | pending | 1.4 |
| 1.6 | [Pipeline board](./phase-1-crm/1.6-pipeline.md) | pending | 1.5 |
| 1.7 | [Activities and follow-ups](./phase-1-crm/1.7-activities.md) | pending | 1.4, 1.5 |
| 1.8 | [Dashboard](./phase-1-crm/1.8-dashboard.md) | pending | 1.6, 1.7 |
| 1.9 | [Playwright smoke](./phase-1-crm/1.9-playwright-smoke.md) | pending | 1.8 |

Long pole: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.8 → 1.9. 1.7 can start after 1.5 (same files as deal/contact detail — do not parallel with 1.5).

### Phase 2 — Space

Specs not written yet. Blocked on Phase 1 (product order; not a code dependency on CRM tables).

### Phase 3 — Rolodex

Specs not written yet.

### Phase 4 — Groove

Specs not written yet.
