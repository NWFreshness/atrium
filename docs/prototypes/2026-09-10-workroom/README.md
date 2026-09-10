# Workroom prototype (2026-09-10)

A **static design prototype** for the Atrium redesign. Not production code, not wired
to the app, not built by `next build`. It exists so the visual direction can be
reviewed in a browser before any feature specs are written.

## Why

The four apps shipped functional but visually bare: Geist + Arial fallbacks, flat
near-black surfaces, no texture or motion, placeholder empty states, emoji icons in
the Space tree, and the cryptic "N" in the corner (that one is the Next.js dev
indicator, not a design element — it disappears in production builds).

## The direction — "The Workroom"

Warm editorial rather than generic dark dashboard.

| Element | Decision |
| --- | --- |
| Surfaces | Espresso/ink browns (`#13100c` → `#2b251b`), not flat black |
| Ink | Warm off-white `#f0e9da`, dimmed to `#a99e88` / `#7a6f5b` |
| Accent | Brass `#dfa33c` — an evolution of the existing amber active state |
| Display type | Fraunces (characterful serif) for titles and figures |
| Body type | Geist, which the app already loads |
| Data type | Geist Mono for labels, dates, tempo, IDs |
| Theme | Dark default; light is warm "paper", not white |
| Texture | Low-opacity SVG paper grain and a top radial brass glow |
| Motion | Staggered load reveals, nav underline sweep, card lift, animated meters |
| Groove | Stays instrument-dark in both themes, per its spec |

## Screens

| File | Screen |
| --- | --- |
| `login.html` | Credentials sign-in with oversized brass monogram |
| `index.html` | Launcher — four described app cards |
| `crm.html` | CRM dashboard — KPI row, revenue chart, funnel, empty-state win rate |
| `space.html` | Space page editor — page tree, blocks, decisions table |
| `rolodex.html` | Rolodex Today — cadence stats, who-to-contact list |
| `groove.html` | Groove — full hardware chassis, four units, transport, scope, VU |

## Viewing it

Static files with no build step. From this directory:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4173/index.html>. Nav links cross-link all six screens.

The theme toggle in the nav works and persists to `localStorage` under
`atrium.theme`, matching the app's existing key. Groove's transport is clickable —
the play button, VU meters, and oscilloscope are simulated in
`assets/workroom.js`; there is no audio engine here.

## What is mocked

- Every number is hardcoded from the demo seed (4 open deals, $130,000 pipeline,
  $66,500 expected) so the screens look like real tenant data.
- Forms do not submit. `login.html` navigates straight to the launcher.
- Groove has no Web Audio; the real engine stays in the Phase 4 implementation.
- Sub-section subnav tabs (CRM Organizations/Contacts/Deals/Pipeline; Rolodex
  People/Circles/Calendar/Timeline) have no dedicated mock screen yet, so in this
  static prototype they point at their app's dashboard mock (`crm.html` /
  `rolodex.html`). They become real per-section routes with the 5.3–5.6
  implementation; the running app already routes them correctly.

## What comes next

This is the review artifact, not the delivery. Once the direction is signed off:

1. Fold the decisions into `docs/superpowers/specs/2026-09-06-atrium-design.md`
   (that file is authoritative, so it changes first).
2. Write Phase 5 feature specs — 5.1 design system (tokens, fonts, theme scaffold),
   then per-app passes, one feature at a time.
3. Implement in-repo via subagent-driven-development on feature branches, with the
   existing `npm test` and `npm run build` gates.

Existing per-app CSS namespacing (`crm-`, `space-`, `rolodex-`, `groove-`) and the
`atrium-nav-` prefix rule from `AGENTS.md` still apply — this prototype deliberately
uses unprefixed classes because it never ships into the app.
