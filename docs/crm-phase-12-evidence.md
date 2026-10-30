# Phase 12 evidence — what commercial CRMs sell, and what this repo can record

**Date:** 2026-10-06
**Status:** proposal backing phase 12 in `roadmap/phases.yaml`. Not a spec. No code was
changed to produce this document and no test or build was run for it.

**Scope note (2026-10-06).** Phase 12 originally also listed the seven Phase 11 dead ends
as 12.4–12.11. That was wrong: those seven already have scoped job cards in
`factory/archive/pre-migration/inbox/` and belong to Phase 11, whose authoritative design
is `docs/superpowers/specs/2026-09-29-crm-integrity-design.md`. They were moved back to
phase 11. Phase 12 is now only the deal-history work (12.1–12.3), which overlaps nothing
in phase 11.

---

## How this was gathered

Ten SearXNG queries (12 results each, deduped by URL) against the local instance on
`localhost:8080`, covering HubSpot, Salesforce, Pipedrive and Zoho feature surfaces plus
forecasting, lead scoring, next-best-action and email/calendar sync. Ten of the highest-
signal results were then extracted in full:

- `https://www.pipedrive.com/en/crm/features`
- `https://support.pipedrive.com/en/article/insights-reports-deal-progress`
- `https://www.zoho.com/crm/features.html`
- `https://knowledge.hubspot.com/scoring/understand-the-lead-scoring-tool`

Every claim below traces to one of those four pages or to a file in this repo. Anything
not attributable is marked unverified rather than stated.

---

## What the vendors actually sell, and what it costs them

The four vendors sell the same three layers: capture (leads, email, calendar, forms),
automation (workflows, cadences, sequences, AI agents), and analytics. This repo has
already built its own version of the capture layer and refuses the automation layer on
purpose. The part that is genuinely missing is analytics with a **time axis** — and every
vendor's version of it is downstream of one fact this schema cannot store.

**Pipedrive Insights** reports deal progress by filtering on `date of entering stage`,
and offers three `measure by` axes: deal value, deal **weighted** value, and number of
deals. The `date of entering stage` filter is documented as locked into the report because
it is "needed to assess deal progress". That filter is the entire feature, and it is a
join against stage-change history this schema does not have.

**Salesforce** forecasting runs four categories — Pipeline, Best Case, Commit, Closed —
against a quota, "with live forecast rollups, visual indicators, AI predictions, and
historical trends" (`help.salesforce.com/.../sf.forecasts3_intro.htm`). Each category is a
rule over opportunity stage and amount, accumulated over the quarter. The accumulator is
stage history.

**HubSpot** lead scoring assigns points from record events and property criteria, with
score and per-group limits, so the score is a running aggregate of what a record *did over
time*. Its deal scores are combined engagement + fit scores, built from history.

**Zoho** packages forecasting, pipeline and workflows under Sales Force Automation, and
leads its page with AI that "distilled" commands into action — the AI layer is downstream
of the same structured deal history.

So: the vendor feature is not "AI scoring". It is **when did this deal enter its stage,
and why did it close**. The AI, the score, and the forecast category are all readers of
that fact.

---

## The gap, in this repo's code

`deals` has `stage`, `value`, `probability`, `closeDate`, `boardOrder` — current state only
(`lib/crm/schema.ts:62-88`). There is no `dealStageEvents` table: zero matches for
`dealStageEvents`, `timeInStage`, `stageConversion` in `lib/crm/`.

Every pipeline number therefore comes from a deal's *current* stage. `pipelineFunnel`
(`lib/crm/dashboard.ts:131-153`) has to compute the funnel as **cumulative** — a deal in
`Negotiation` is counted at `Proposal+`, `Qualified+` and `New+` — precisely because it
cannot know which stages the deal actually passed through. `winLoss` (line 155) attributes
a win to a close month with no record of how long it took. Nothing can produce days-in-stage,
stage conversion, or forecast-vs-actual. This is gap **G12** in `docs/crm-feature-ideas.md`,
and that doc already flagged it as "the most valuable feature on the list and the one that
unlocks three others".

### The write path must change first — verified, not assumed

The ideas doc said a stage event "must append the event, in the **same** `db.batch` as the
renumber". Reading `lib/crm/move-deal.ts:51-67` shows that batch does not exist today:

```ts
for (let boardOrder = 0; boardOrder < ordered.length; boardOrder += 1) {
  const row = ordered[boardOrder];
  if (row.id === id) {
    moved = await updateDeal(tenantId, id, { stage, boardOrder, ...probability }, repo);
    continue;
  }
  await updateDeal(tenantId, row.id, { boardOrder }, repo);
}
```

N sequential awaited writes. A failure at k leaves deals 0..k renumbered and the rest not.
There are **two** stage-change entry points — this loop, and `updateDeal`'s probability
rebase via `nextProbabilityOnStageChange` (`lib/crm/queries-shared.ts:187`) when the deal
form changes a stage. Both must write the event or the history lies. Hence 12.1 before 12.2.

**Constraint that shapes the fix:** `drizzle-orm/neon-http` has no interactive transaction —
`db.transaction()` throws at runtime, per ADR-0002 and `lib/db/batch-transaction.ts:8-13`.
`db.batch([...])` is the only atomic write, and per that file's own header every statement
must be fully built (ids included) before any runs, so the event id is generated in
application code.

---

## What was already shipped, and is therefore out of scope

The ideas doc is stale in places; `factory/archive/pre-migration/feature_list.json` and
`git log` settle it:

| Ideas-doc item | Reality |
|---|---|
| A3 table sorting (G3) | shipped — `d8ede81 feat(crm): sort CRM table columns (#97)` |
| A5 deal number validation (G10) | shipped — `14ae280 (#96)`; `assertMoney`/`assertPercent` at `lib/crm/queries.ts:297-337` |
| 11.1 pipeline/activity e2e | shipped — `b777ffa test(crm): e2e coverage for pipeline and activities (#92)`; `e2e/crm-pipeline.spec.ts`, `crm-activities.spec.ts` |

`progress.md` in the archive lists B1 QuickFind, B2 filters, B3 Tasks and B4 as realized by
Phase 11. The code says otherwise — `lib/crm/search.ts` does not exist, there is no
`app/(authenticated)/crm/tasks/`, `ListDealsOpts` has no `stage`, and `activity-form.tsx`
has no `occurredAt`. The archived `progress.md` overstates what shipped; trust the code
and the ledger, not that summary.

**Do not repeat that mistake.** An earlier draft of this document, and an earlier draft of
`roadmap/phases.yaml`, both treated those unshipped gaps as phase-12 work because the
archived `progress.md` said phase 11 delivered them. They are phase 11, and they are
already tracked there.

---

## Still-open gaps, re-verified in code this session

| Gap | Evidence (all re-checked 2026-10-06) |
|---|---|
| G1 activity delete/edit | `deleteActivity`/`updateActivity` exist at `lib/crm/queries.ts:406,420`; zero matches for `deleteActivityAction`/`updateActivityAction` in `lib/crm/` or `components/crm/`; `activity-timeline.tsx:70-85` renders only a done-checkbox |
| G2 no detail-page edit | `app/(authenticated)/crm/deals/[id]/page.tsx:37-72` is a read-only `<dl>`; the only form is `<ActivityForm>` at line 74 |
| G4 no deal filters | `app/(authenticated)/crm/deals/page.tsx:11-12` reads only `q`; `ListDealsOpts` (`lib/crm/queries-shared.ts:73-77`) is `q`/`organizationId`/`contactId` |
| G6 no tasks surface | no `app/(authenticated)/crm/tasks/`; `data.followUps` consumed only by dashboard panels |
| G7 cannot backdate | `components/crm/activity-form.tsx` has no `occurredAt` field |
| G8 no last-contacted | `compareActivitiesNewestFirst` exists at `lib/crm/queries-shared.ts:168`; no caller in `components/crm/` |
| G9 no unique email | no `uniqueIndex` anywhere in `lib/crm/schema.ts`; `contacts.email` is nullable with only `contacts_tenantId_idx` |
| G11 silent orphaning | `onDelete: "set null"` at `lib/crm/schema.ts:51,65,76`; no cascade-preview helper in the repo |
| G12 no stage history | see above |
| G13/G14/G15 | no `tags` column in `lib/crm/schema.ts`; no import/export in CRM; `limit()` in `lib/crm/queries-drizzle.ts` appears only in get-by-id paths (lines 118, 194, 304), never in a list function |

---

## Phase 12 cut, and what it costs

Phase 12 is **three intents, 17–24h** (sum of the per-intent ranges in
`roadmap/phases.yaml`): 12.1 make `moveDeal` atomic, 12.2 stage history → `/crm/velocity`,
12.3 won/lost reasons.

**Why history, and why alone.** It is the only item in the entire gap list that is
structurally impossible to fake with the current schema, and it is the one the vendor
research independently points at from four different product surfaces. It is also a
write-path change — the riskiest kind of work in this repo, per ADR-0002 — which is an
argument for doing it as its own small phase, not folded into a UI sweep.

**Where the dead ends went.** The seven integrity gaps (G1, G2, G4, G6, G7, G8, G9, G11,
G16) are Phase 11, tracked in `roadmap/phases.yaml` phase-11 with their scoped job cards
in `factory/archive/pre-migration/inbox/`. This document's gap table remains the evidence
for *why* they matter; it no longer proposes them.

**Sequencing.** Phase 12 has one chain: 12.1 → 12.2, with 12.3 order-free. Phase 11's
chains are separate and untouched: 11.1 → 11.4 → 11.5 and 11.3 → 11.9 → 11.10, per the
design doc's own phase table.

---

## Considered and rejected

**Email and calendar sync.** Present at every vendor — Pipedrive, Nutshell, Salesforce
(Einstein Activity Capture), Dex, OWA-Compatible sync at 9 of 10 vendors in the search
results. Rejected: it needs OAuth plus a mailer, and a mailer is a locked non-goal
(ADR-0003 no-revocation decisions, the 1.7 deferral recorded in the ideas doc). Reversing
that is a phase of its own with its own reversal trigger, not a feature.

**Lead scoring.** HubSpot's engagement/fit scoring, Microsoft Dynamics' lead and
opportunity scoring (which documents a floor of "at least 40 qualified leads and 40
disqualified leads ... in the past two years"), Pipedrive's scoring. Rejected on the
Dynamics threshold alone: the demo tenant has 6 deals. A score is a running aggregate over
record events — which is 12.2's output. Revisit *after* stage history exists, and it
becomes cheap and honest.

**AI next-best-action.** Zoho Zia, Dynamics Next Best Action, Effiecly. Rejected: same
reason as scoring — a recommendation engine over 6 deals is theatre, and it needs an API
key plus a data-egress decision the repo has not made.

**Multi-currency.** USD-only by decision; `formatMoney` is one `Intl.NumberFormat`. Honest
historical totals would require storing an FX rate or date.

**Configurable pipeline stages.** Excluded in 1.6. Breaks `STAGE_PROBABILITY`, the funnel
ordering, the six-column grid and six stage CSS classes. A v2 product change.

**Bounded lists (G15).** The ideas doc's own advice holds — do not build pagination before a
tenant has real volume, and if it is ever built, do **not** switch `getDashboard` to a
capped helper, because it needs every row. Excluded from this phase deliberately.

**Soft deletes.** Excluded: doubles every list query's filter and every seed's wipe.
12.7's consequence preview gets most of the safety for none of that cost.

---

## How to verify any of this before building it

The gap table is mechanical and cheap to repeat — CRM code moves, so re-run before
speccing:

```
grep -rn "dealStageEvents\|timeInStage\|stageConversion" lib/crm/     # G12, 12.2 premise
grep -rn "deleteActivityAction\|updateActivityAction" lib/crm/        # G1, 12.4 premise
grep -n "uniqueIndex" lib/crm/schema.ts                               # G9, 12.6 premise
grep -n "occurredAt" components/crm/activity-form.tsx                 # G7, 12.5 premise
ls app/\(authenticated\)/crm/tasks lib/crm/search.ts                  # G6, G16
grep -n "await updateDeal" lib/crm/move-deal.ts                      # 12.1 premise
```