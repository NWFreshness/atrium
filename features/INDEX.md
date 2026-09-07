# Atrium — Feature Index

Board for phases and features. Status here is the source of truth for what is done.
Cold start: [HANDOFF.md](../HANDOFF.md)
Design: [docs/superpowers/specs/2026-09-06-atrium-design.md](../docs/superpowers/specs/2026-09-06-atrium-design.md)
In progress: [CURRENT_FEATURE.md](../CURRENT_FEATURE.md)

Only one feature `in_progress`. Later phases get specs when that phase starts.

## Build order

Critical path: 0.1 → 0.2 → 0.3 → 0.4 → 0.5 → Phase 1 CRM.
Nothing in phase 0 runs in parallel (shared root files).

### Phase 0 — Atrium platform

| ID | Feature | Status | Depends on |
| --- | --- | --- | --- |
| 0.1 | [Next.js scaffold + AGENTS.md + CI](./phase-0-platform/0.1-next-scaffold.md) | completed | nothing |
| 0.2 | [Drizzle + Neon users and tenants](./phase-0-platform/0.2-drizzle-neon-users.md) | completed | 0.1 |
| 0.3 | [Auth.js credentials login](./phase-0-platform/0.3-authjs-credentials.md) | completed | 0.2 |
| 0.4 | [Nav, theme, launcher](./phase-0-platform/0.4-nav-theme-launcher.md) | pending | 0.3 |
| 0.5 | [Tenancy helper + Reset demo](./phase-0-platform/0.5-tenancy-demo-reset.md) | pending | 0.4 |

### Phase 1 — CRM

Specs not written yet. Blocked on 0.5.

### Phase 2 — Space

Specs not written yet. Blocked on Phase 1 (product order; not a code dependency on CRM tables).

### Phase 3 — Rolodex

Specs not written yet.

### Phase 4 — Groove

Specs not written yet.
