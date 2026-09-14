# Atrium Design — Phase 10: PNW (redesign)

**Status:** proposed — specs written, not implemented
**Supersedes as the theme authority:** Phase 5 (Workroom) for colour and type values only; Phase 5's structural decisions (namespaces, token names, reveal motion, Groove staying dark) all stand.
**Studies:** `docs/prototypes/2026-09-14-pnw/palette.html`, `docs/prototypes/2026-09-14-pnw/typography.html`

## Problem

Phase 5 gave the product a coherent point of view — espresso, brass, Fraunces — and it holds together. Two problems have accumulated since:

1. **The theme is warm in a way that fights the product's own vocabulary.** The Workroom's espresso-and-brass is a pub-at-night palette. Atrium is a Pacific Northwest product — four apps, one login, used daily by someone who lives where it rains sideways — and the Workroom reads as generically "warm editorial" rather than as _here_. Six colours drawn from the region (moss, mist, charcoal/basalt, lichen, cedar, golden) place the product in its landscape without a single illustration.
2. **The type stack is charming and slightly underbuilt.** Measured, Fraunces is the narrowest face in the candidate set (477/1000em average lowercase advance, 45 % x-height — the lowest of ten). Against a product whose screens are mostly tables, tiles, and mono data, a low-x-height display serif reads delicate. The brief for this phase is the opposite: sturdy, highly readable, clear.

Phase 10 replaces the theme values and the type stack, and — this is the part Phase 5 did not have — it ships a **gate that computes contrast from the shipped tokens**, because the studies that produced these values kept finding real failures that nothing in the repo would have caught.

## Users

Unchanged from the parent design: one owner (real data, empty on seed), one demo (seeded, resettable), and self-serve members behind the signup flag. Phase 10 changes no user-facing behaviour, so no user type gains or loses anything — the phase is entirely about what the same product looks like.

## Job

When I open Atrium, I want it to look like it was made for where I live and to be effortless to read at 16px in a dense table — not like a well-typeset template that could be any product with any data in it.

## Decisions

| #   | Decision                          | Choice                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Ground direction                  | **Dark = basalt `#25282a`, light = mist `#eef1f2`**                                                      | Measured: mist on basalt is 13.07:1 — the ink/ground pair already works in both directions. The theme inverts the same two pigments instead of inventing a second palette. Warm espresso is retired, not kept as a third theme.                                                                                                                                                                        |
| 2   | Where moss goes                   | **Surface on dark, ink on light**                                                                        | Moss `#2d4a3e` is 1.53:1 on basalt and 8.56:1 on mist. The palette's most tempting mistake is "brand colour on the background"; the token block documents the rule so a later pass cannot make it silently.                                                                                                                                                                                            |
| 3   | Three text-safe variants          | **`--clay-ink #e0a488` (dark), `#8f5138` (light); light `--brass #8a6320`; light `--ink-faint #5f6b5a`** | Raw cedar is 3.97:1 on basalt and 3.29:1 on mist; raw golden is 1.88:1 on mist. Text gets its own value; the bright pigments stay fills that carry no text. 10.5 measured the initials avatar's first cut (mist on raw cedar) at **3.29:1** and moved it to a `--clay-ink` fill with `--bg-0` text (6.95:1 dark / 5.44:1 light). An earlier draft of this row claimed a 4.55:1 exception for mist on raw cedar; that number was wrong and no exception remains. |
| 4   | Fills vs text are separate tokens | **`--brass-bright` / `--clay` are fills; `--brass` / `--clay-ink` are text**                             | The palette study's first cut shipped a solid button as charcoal-on-`#8a6320` = 2.75:1 and its own QA caught it. Splitting the roles is cheaper than remembering the rule.                                                                                                                                                                                                                             |
| 5   | Data series                       | **Four slots: lichen, cedar-lifted, rain, timber; `--violet` retired**                                   | Measured, the four are 1.0–1.29 apart in luminance — they separate by **hue**, so every chart must label each series directly. The PNW palette has no purple; the slot becomes weathered timber `#b9ab93`.                                                                                                                                                                                             |
| 6   | Type stack                        | **Outfit 700 headings / Archivo 400 body / Geist Mono data**                                             | Outfit is the geometric half of the brief (49 % x-height, 522/1000em) without Montserrat's 601/1000em width. Archivo vs Inter at 16px: 53 % vs 55 % x-height (one step) but 497 vs 535/1000em advance — 7 % narrower, which a four-column CRM table notices. Both measured from the loaded outlines.                                                                                                   |
| 7   | Alternative held in reserve       | **Lora 600 / DM Sans 400**                                                                               | The brief's editorial-solitude half, and the better answer if "high-end heritage brand" outranks "modern architectural firm". It is a two-line change in 10.1 (`--font-display`, `--font-sans` + the two `next/font` loaders) plus the type assertions in 10.7. Trigger to flip: if 10.2 ships and the product still reads like a startup dashboard rather than a firm, flip it there and re-run 10.7. |
| 8   | Token names                       | **Keep every name the app already has; add `--clay-ink`, `--timber`, the type-scale tokens**             | Four per-app CSS modules and 100+ class rules resolve `--bg-*`, `--ink*`, `--brass*`, `--moss`, `--clay`, `--slate`. Renaming would turn a value swap into a repo-wide refactor. Only `--violet` retires.                                                                                                                                                                                              |
| 9   | Groove                            | **Its own `--inst-*` scope, recast to the PNW family, still dark under light**                           | The desk is hardware; paper does not reach it. 5.6 removed the light overrides deliberately and 10.7 asserts they stay absent.                                                                                                                                                                                                                                                                         |
| 10  | Motion                            | **Keep the `reveal` stagger; add a drifting clearing-sky layer; both gated by `prefers-reduced-motion`** | One orchestrated page load beats scattered micro-interactions, and a 46 s drift is atmosphere rather than noise — but not for users who asked for less motion.                                                                                                                                                                                                                                         |
| 11  | New gate                          | **A unit test that computes WCAG contrast from the shipped CSS**                                         | Every colour failure found while designing this phase was arithmetic, not taste: a 62 %-opacity lichen at 2.96:1, a dimmed golden fill at 2.75:1, light-mode lichen at 1.99:1. A fitness function catches the next one; a careful reader will not.                                                                                                                                                     |

## Non-goals

- No new app, route, role, table, migration, or dependency. This phase touches CSS tokens, three `next/font` loaders, component class hooks, and tests.
- No Tailwind, no shadcn, no TanStack Query, no component library — the parent design's stack lock stands.
- No behaviour change of any kind: same queries, same tenant scoping, same server actions, same copy, same accessible names. Playwright suites must pass with only instrument/token-value assertions edited.
- No RLS, no session revocation, no OAuth, no mailer, no MFA, no `script-src` CSP, no `middleware.ts` → `proxy` rename. Every one of those stays deferred exactly as ADR-0001…0006 and the parent design record.
- No screenshot goldens or visual-diff baselining (deferred since 5.7).
- No theme-aware Groove: the desk stays instrument-dark by decision.
- No third theme. Espresso is retired, not preserved behind a flag.
- No new font families beyond the three named stacks, and no serif display fallback beyond a system-serif guard.

## Data and auth

None. Phase 10 adds no table, column, index, query, session field, or env var. The Neon dev branch does not change; no migration is generated or applied. `.env` gains nothing.

## Flows

Unchanged. The five flows the parent design defines (login, demo reset, CRM deal → pipeline, Rolodex follow-up, Space page authoring) keep their steps, their copy, and their error states; only their appearance changes, feature by feature.

## Chrome

The phase's own chrome decisions, in the order they land:

1. **10.1** establishes the palette, the type scale, the atmosphere layers, and the two usage rules (one highlight per screen; dark moss is a surface, light moss is ink).
2. **10.2** builds the frame — nav, launcher, login — and is where the type pairing proves itself in place.
3. **10.3–10.5** apply it per app with a shared tone mapping: cedar for late/overdue, golden for the single most important thing, moss/lichen for open and on-cadence, rain-slate for neutral.
4. **10.6** recasts the desk's instrument tokens without letting paper reach it.
5. **10.7** retires the espresso assertions across every existing gate, adds the computed-contrast gate and the browser type assertions, and proves the gates by injection.

## Abuse

Not applicable — no new input surface, no new data path, no new auth path. The phase's only security-relevant surface is unchanged: the login form keeps its server-side validation, the throttle (9.4), and the generic error copy.

## Phase table

| ID   | Feature                                    | Depends on | Effort |
| ---- | ------------------------------------------ | ---------- | ------ |
| 10.1 | PNW tokens, type stack, and theme scaffold | nothing    | 4–6 h  |
| 10.2 | Shared chrome, launcher, and login         | 10.1       | 3–5 h  |
| 10.3 | CRM pass                                   | 10.1, 10.2 | 3–4 h  |
| 10.4 | Space pass                                 | 10.1, 10.2 | 3–4 h  |
| 10.5 | Rolodex pass                               | 10.1, 10.2 | 3–4 h  |
| 10.6 | Groove instrument recast                   | 10.1       | 2–4 h  |
| 10.7 | Contrast gate, theme QA, and smoke         | 10.2–10.6  | 4–6 h  |

**Long pole:** 10.1 → 10.2 → 10.7. 10.3, 10.4, 10.5, and 10.6 may run in any order after their dependencies land (disjoint CSS module sets), but all four must land before 10.7. Do not parallelise two features that touch the same files. Preserve the `crm-` / `space-` / `rolodex-` / `groove-` / `atrium-nav-` namespaces and the `atrium-` shared layer exactly as Phase 5 left them.

## Honest limits

- The type pairing is the phase's one taste call with a real alternative. Decision 7 records it, the trigger to revisit it, and its exact cost.
- Series colours separate by hue, not luminance (1.0–1.29 apart), so chart accessibility rests on direct labels. 10.1 requires them; 10.7 cannot automate that requirement honestly, and says so.
- "One golden element per screen" is a review criterion, not a test. 10.7 states that rather than asserting something weak and calling it coverage.
- The values here were measured in the two studies' own pages, not in the app. 10.1's first task is porting them verbatim; if a value changes, it changes in the study first and gets re-measured there.
- Nothing in this phase has been implemented. The studies are standalone HTML in `docs/prototypes/2026-09-14-pnw/`; no file under `app/`, `components/`, or `lib/` imports them.
