# ADR-0004: Groove has no tables

## Status: Accepted

## Context

Groove is the fourth app: a groovebox desk with four units (RHYTHM DR-16,
BASS MB-1, PADS PX-4, LEAD LX-2), four factory patches (NEON RIVIERA, BASALT,
SUNROOM, LATE ORBIT), a transport and a master bus. Its state is a `Patch`
object held in React state; `lib/groove/patches.ts` holds the factory patches as
code; `lib/groove/audio/*` synthesises the sound with the Web Audio API.

CRM, Space and Rolodex each own tables, a `tenantId`, a demo seed and a demo
resetter. Groove was the first app added that did not adopt that pattern, and
the question "where are Groove's rows?" was asked deliberately rather than
skipped.

## Options considered (benefits / costs)

**Client-only state, no database at all** (chosen)

- Benefits: nothing to scope to a tenant, so nothing to leak across tenants;
  no schema, no migration, no seed, no demo resetter, and no query module; the
  instrument is identical for every user, which is exactly what a factory
  preset desk should be; changing the sound is a code change with no write path
  and no backfill.
- Costs: a user's edits are not persisted — reload returns to the factory patch
  and there is no "my song" artifact, no sharing, no history; nothing about
  Groove can be queried or reported on.

**Tenant-scoped tables for saved patches** (and later songs)

- Benefits: persistence (a user's patch survives a reload), the ability to
  share or publish a patch, and a place for per-user preferences.
- Costs: adds a tenant-scoped table, a `tenantId` predicate, a demo seed, a
  resetter entry, a query module and migrations to an app whose entire value is
  the sound; every future reset/seed/index decision grows by an app; and no
  requirement or spec currently asks for saved patches. The reference
  implementation's Groove is client-only too — it has no server module.

**Browser persistence (`localStorage`) instead of the database**

- Benefits: survives a reload with no server work and no tenancy question.
- Costs: not per-account (a shared browser shares patches), invisible to the
  server, and it introduces a second source of truth for a patch with its own
  versioning problem. It buys the persistence half of the rejected option while
  adding a state-sync bug class; not worth it without a product ask.

## Decision

Groove stays client-only. No Groove table, no seed, no demo resetter, no
`tenantId` on Groove state. Domain logic is pure TypeScript in `lib/groove/`;
the audio engine is imported only from `"use client"` modules, and Web Audio is
the only audio technology in the product (no synthesis library, no sample
files). Phase 7's tenancy, index and reset work skips Groove entirely — and must
keep skipping it.

## Consequences (+ / −)

- **+** The smallest possible surface for a cross-tenant mistake: Groove has no
  server data, so it cannot read or write another tenant's rows.
- **+** No schema, migration, seed or resetter to maintain when the instrument
  changes; the factory patches are versioned with the code that plays them.
- **+** The demo reset and the tenant index work stay proportional to the three
  data-owning apps.
- **−** Patches are not saved; there is no user-visible persistence, sharing or
  export.
- **−** "Save my patch" is not a small feature here: it is a schema + seed +
  resetter + query + index change, i.e. a phase with its own spec.

## Reversal trigger

A spec asks for saved or shared patches per tenant. Then it is a new phase
(documented trigger: it needs schema, seed, resetter and `tenantId` like the
other data apps) — never an ad-hoc table added to Groove in a UI feature.
