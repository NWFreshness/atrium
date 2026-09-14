# Phase 10 studies — PNW palette and typography

Two standalone HTML studies, kept as the source of record for the values Phase 10 ports into `app/globals.css`. Nothing under `app/`, `components/`, or `lib/` imports them; they are not built, bundled, or served. Open them directly in a browser.

| File              | What it is                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `palette.html`    | The six PNW colours applied to Atrium's chrome, with a basalt/mist theme toggle. Prints the WCAG ratio of every pair it uses and renders the three naive combinations (moss on basalt, golden on mist, lichen on mist) as they would actually ship.                                      |
| `typography.html` | Ten faces — the brief's candidates plus Atrium's current Fraunces/Geist — with a live heading × body picker that re-sets the applied mock, and metrics measured from the loaded outlines (x-height, cap height, average lowercase advance, the width a 72-character line needs at 16px). |

Both pages measure themselves in the browser rather than quoting a specimen sheet: contrast from WCAG 2.1 relative luminance, type metrics from canvas `TextMetrics` against the loaded webfont. The numbers they print are the numbers quoted in `docs/superpowers/specs/2026-09-14-pnw-design.md` and in the `features/phase-10-pnw/` specs.

Rules for anyone changing a value:

1. Change it in the study first, re-measure, then port it into the app.
2. If a study and a spec disagree, the spec is wrong — fix the spec.
3. Do not "improve" a value by eye in `app/globals.css` and leave the study behind; 10.7's contrast gate reads the app, and the study would then be a lie.

Fonts come from Google Fonts by `<link>`; the studies need network access on first load, and degrade to system fallbacks offline (which is also why the metrics panel would report the fallback's numbers — check `errors`/`fontsMissing` if a number looks wrong).
