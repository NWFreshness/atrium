# Groove Design (Phase 4)

**Date:** 2026-09-09
**Status:** approved
**Product:** Atrium / Groove
**Parent:** [2026-09-06-atrium-design.md](./2026-09-06-atrium-design.md)
**Behavior source:** [ed-donner/bench](https://github.com/ed-donner/bench) `docs/groove/` and `web/src/groove/`

If this file and a later feature spec disagree, update this file first.

---

## Problem

Groove is the browser groovebox in Atrium: four hardware-style units, one transport, a master DJ filter. Everything is synthesised live with the Web Audio API.

Bench did this as a Vite MPA page with no login. Atrium hosts the same instrument behind Auth.js so the suite is one product. There is still no database and no persistence.

## Users

Same as the parent design: owner and demo can both play it. There is no tenant-scoped Groove data, no seed rows, and no Reset demo work. Owner and demo hear the same factory patches.

## Job

One screen at `/groove`: a desk of four units (RHYTHM DR-16, BASS MB-1, PADS PX-4, LEAD LX-2), a transport, and a master strip (DJ filter, sweep, sidechain, send FX, scope).

Clone Bench jobs-to-be-done, not pixel-identical CSS and not Vite.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Feature slice | 4.1–4.8 Space-shaped | Domain first, then shell, grids, transport, engine, master, wiring, smoke |
| Persistence | None | Parent design: Groove never hits the database |
| Samples / audio libs | Web Audio only | Bench: no samples, no Tone.js, no Howler |
| Factory patches | Port Bench A–D names, BPM, character | Prefer Bench code over the REQUIREMENTS “3 patches” line |
| Photos / files | n/a | No assets besides CSS |
| CSS | `groove-` prefix, Groove-only import | Avoid colliding `.app` / `.board` / `:root` with other apps |
| Theme | Panel can stay dark; define `[data-theme="light"]` | Parent design; do not force `atrium.theme` |
| Audio import | Client components only | `AudioContext` is browser-only; RSC must not import the engine |
| Tests | Domain Vitest + shallow Playwright | Headless has no audio device; playhead LED is the clock proxy |

## Data model

There are no Drizzle tables.

Domain lives in `lib/groove/` (pure TypeScript, no `AudioContext`):

```ts
// types: UnitId drums|bass|pads|lead, STEPS=16, DrumLane, DrumPattern (0|1|2),
//   MelodicStep { on, note, chord, vel }, Params, Patch, ParamSpec, SWEEP_BARS
// music: noteName, mtof, CHORD_SHAPES, VOICINGS, chordIntervals, clampNote
// filter: DJ macro 0.5 = OPEN; lowpass below, highpass above; filterLabel; filterGainAt
// params: UNIT_PARAMS, UNIT_META, FILTER_SPEC, MASTER_GROUPS, MASTER_PARAMS
// patches: four factory Patch objects + clonePatch
```

Audio graph lives in `lib/groove/audio/` and is imported only from `"use client"` files:

- `engine.ts` — lookahead scheduler (25 ms timer, 0.12 s ahead)
- `drums.ts` — six synthesised voices
- `synths.ts` — mono bass/lead, polyphonic pads
- `master.ts` — bus, DJ filter, pump, send FX, analyser

UI lives in `components/groove/`. Route is `app/(authenticated)/groove/`.

Do not re-export Groove names from `lib/db/schema.ts`. Do not register a demo resetter.

## Factory patches (Bench)

Patch A is loaded at startup so the first press of play makes music. Switching is instant and works during playback.

| Slot | Name | Character (Bench) |
| --- | --- | --- |
| A | NEON RIVIERA | synthwave, F minor, 112 BPM |
| B | BASALT | dark techno, A phrygian, 130 BPM |
| C | SUNROOM | lo-fi soul, C minor, 94 BPM, heavy swing |
| D | LATE ORBIT | filter house, F# minor, 126 BPM, eight-bar triangle sweep |

Port Bench `patches.ts` rather than inventing new names or tempos. REQUIREMENTS said “3 default patches”; Bench code ships four — prefer the code.

## Units (Bench `UNIT_META` / `INSTRUMENT.md`)

| Id | Face | Voice |
| --- | --- | --- |
| drums | RHYTHM DR-16 | kick, snare, clap, closed/open hat, FM perc |
| bass | BASS MB-1 | mono saw/square/pulse + sub |
| pads | PADS PX-4 | polyphonic detuned-saw chords |
| lead | LEAD LX-2 | mono saw/pulse/triangle/FM |

Drum cells cycle rest → hit → accent. Melodic cells toggle; drag/scroll changes pitch; pads shift-click cycles chord shape. Velocity lane under melodic sequencers.

## Master

- **FILTER** — 0.5 wide open; left closes resonant lowpass; right opens highpass. RESO, BITE.
- **SWEEP** — tempo-synced 1/2/4/8/16 bars, rise/fall/triangle/sine. LATE ORBIT uses this.
- **SIDECHAIN** — ducks bass/pads/lead on kick; drums untouched.
- **SEND FX** — ping-pong delay in 16ths, reverb, glue.
- **Scope** — spectrum with the live filter curve.

## Accessibility

Every sequencer cell has a unique `aria-label` (`KICK step 3`, `BASS step 12`) plus `aria-pressed`. Each unit is a named region (`RHYTHM`, `BASS`, `PADS`, `LEAD`). `getByRole` matches substrings — use `exact: true` so `BASS step 1` does not match steps 10–16.

## Routes and shell

- `/groove` — the instrument. No subnav. Atrium strip stays.

Unauthenticated `/groove` → `/login`.

CSS `groove-` prefixed (or CSS-module locals), imported only from Groove files. Hardware-style desk, desktop 16:9. Not pixel-identical to Bench `styles.css`.

## Features

| ID | Feature | Depends on |
| --- | --- | --- |
| 4.1 | Domain: types, music, filter, params, patches | 0.4 |
| 4.2 | Shell and hardware layout | 4.1 |
| 4.3 | Knobs, faders, sequencer grids | 4.1, 4.2 |
| 4.4 | Transport, patches, mute, keyboard, revert | 4.3 |
| 4.5 | Audio engine (clock, drums, synths) | 4.1, 4.4 |
| 4.6 | Master filter, sweep, pump, FX, scope | 4.5 |
| 4.7 | Live wiring: audition, applyParams, patch-during-play | 4.5, 4.6 |
| 4.8 | Playwright smoke | 4.7 |

Long pole: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.8. Do not parallel any two Groove features. Do not add Groove tables.

## Out of v1

Persistence, MIDI, recording/export, sample playback, Tone.js / extra audio libraries, mobile layout, user-authored patch files, visual screenshot diffs, asserting that it “sounds good” in CI.

## Testing

TDD on domain: notes, chords, filter macro, params, patches, `clonePatch`, sweep/gap helpers. `env -u DATABASE_URL npm test`. Controller re-runs `npm test` and `AUTH_SECRET=ci-build-placeholder npm run build`.

Playwright in 4.8 is deliberately shallow (Bench `e2e/groove/instrument.spec.ts`): units render, transport start/stop, playhead advances (accumulate LED classes — do not sample with `expect.poll` alone), drum toggle, patch changes tempo, mute, no console error. Headless has no audio device. Stop the transport before walking away from a headed run.

## Board

`features/INDEX.md`. Specs: `features/phase-4-groove/`. Next implementable unit after this file lands: 4.1.
