/**
 * Phase 10.5 — the Rolodex PNW gate.
 *
 * `rolodex-pass.test.ts` (5.5) still owns the Workroom-era contract; this file
 * extends it with the PNW truths the pass is judged on: the cadence mapping
 * (overdue clay-ink / due golden / on cadence moss / snoozed-off rain), the
 * one-highlight rule on Today, the density floor the who-to-contact list keeps,
 * the measured cedar avatar, the lichen → golden circle ladder, and the
 * espresso values that must not come back.
 *
 * These are source assertions on purpose: a stylesheet test may name the values
 * it forbids, and the colours are what a reviewer reads.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const todayCss = read("components/rolodex/today.module.css");
const todayTsx = read("components/rolodex/today-dashboard.tsx");
const chartsTsx = read("components/rolodex/today-charts.tsx");
const peopleCss = read("components/rolodex/people.module.css");
const circlesCss = read("components/rolodex/circles-board.module.css");
const calendarCss = read("components/rolodex/calendar-month.module.css");
const calendarTsx = read("components/rolodex/calendar-month.tsx");
const calendarPage = read("app/(authenticated)/rolodex/calendar/page.tsx");
const personPage = read("app/(authenticated)/rolodex/people/[id]/page.tsx");
const initialsTsx = read("components/rolodex/initials.tsx");
const subnavTsx = read("components/rolodex/rolodex-subnav.tsx");
const personForm = read("components/rolodex/person-form.tsx");
const importDialog = read("components/rolodex/import-dialog.tsx");
const chrome = read("app/workroom.css");

/** The Workroom espresso/brass era values, as 10.7's retired list names them. */
const ESPRESSO = [
  "#13100c",
  "#1b1712",
  "#231e16",
  "#2b251b",
  "#f0e9da",
  "#ece5d6",
  "#262015",
  "#a86f14",
  "#dfa33c",
  "#221a0c",
  "#fdf8ec",
];

const countOccurrences = (src: string, needle: string) =>
  src.split(needle).length - 1;

/** The body of the first rule whose selector is exactly `.selector`. */
function rule(css: string, selector: string): string {
  const match = css.match(
    new RegExp(
      `\\.${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    ),
  );
  expect(match, `missing a .${selector} rule`).toBeTruthy();
  return match![1];
}

/**
 * The body of the rule that paints `.selector` — used where the selector may
 * also appear inside a shared selector list (where the first match would be the
 * geometry-only block).
 */
function coloredRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bodies = [
    ...css.matchAll(new RegExp(`\\.${escaped}\\b[^{}]*\\{([^}]*)\\}`, "g")),
  ].map((match) => match[1]!);
  const colored = bodies.find((body) => /(^|\s)color:/.test(body));
  expect(colored, `.${selector} paints no colour`).toBeTruthy();
  return colored!;
}

describe("cadence mapping is the palette's job (10.5 §1)", () => {
  it("orders the four KPI tiles clay-ink / brass / moss / slate", () => {
    const expected = ["--clay-ink", "--brass", "--moss", "--slate"];
    expected.forEach((token, index) => {
      const tile = rule(
        todayCss,
        `rolodex-today-stats > div:nth-child(${index + 1})`,
      );
      expect(tile, `tile ${index + 1}`).toContain(`--stat-c: var(${token})`);
    });
  });

  it("keeps one tile per cadence state, no tile with two accents", () => {
    const tiers = [
      ...todayCss.matchAll(
        /\.rolodex-today-stats > div:nth-child\(\d\)\s*\{([^}]*)\}/g,
      ),
    ];
    expect(tiers).toHaveLength(4);
    for (const [, body] of tiers) {
      expect(body!.match(/--stat-c:/g)).toHaveLength(1);
    }
  });

  it("steps the due chips down to one golden row and lichen for the rest", () => {
    // cedar lifted for the overdue label, raw cedar as the 1px rule around it
    const overdue = coloredRule(todayCss, "rolodex-today-overdue");
    expect(overdue).toContain("color: var(--clay-ink)");
    expect(overdue).toContain("var(--clay)");
    // golden — the soonest due row, and the only golden chip on the screen
    expect(coloredRule(todayCss, "rolodex-today-due")).toContain(
      "var(--brass)",
    );
    // the rest step down to the on-cadence moss family
    const soon = coloredRule(todayCss, "rolodex-today-soon");
    expect(soon).toContain("var(--moss)");
    expect(soon).toContain("var(--ink-dim)");
  });

  it("keeps the chart series tied to the tile/chip colour they share", () => {
    for (const state of ["overdue", "due", "on cadence", "snoozed"]) {
      expect(chartsTsx.toLowerCase(), state).toContain(state);
    }
    // the 10.1 literals stay verbatim — the namespace gate checks every hex
    for (const hex of ["#a3b19b", "#dfa84a", "#e0a488", "#8b9fc2", "#b9ab93"]) {
      expect(chartsTsx).toContain(hex);
    }
  });

  it("maps the people/circles status chips onto the same four states", () => {
    for (const status of [
      "overdue",
      "due_soon",
      "in_touch",
      "snoozed",
      "off",
    ]) {
      expect(peopleCss).toContain(`rolodex-status-${status}`);
    }
    expect(coloredRule(peopleCss, "rolodex-status-overdue")).toContain(
      "var(--clay-ink)",
    );
    expect(coloredRule(peopleCss, "rolodex-status-due_soon")).toContain(
      "var(--brass)",
    );
    expect(coloredRule(peopleCss, "rolodex-status-in_touch")).toContain(
      "var(--moss)",
    );
    expect(coloredRule(peopleCss, "rolodex-status-snoozed")).toContain(
      "var(--slate)",
    );
  });
});

describe("one highlight on Today (10.5 §4)", () => {
  it("renders exactly one primary button, and it is Log contact", () => {
    expect(countOccurrences(todayTsx, "atrium-btn-primary")).toBe(1);
    expect(todayTsx).toContain("Log contact");
    expect(todayTsx).toMatch(/atrium-btn-primary[\s\S]{0,400}Log contact/);
  });

  it("caps the golden chip to the soonest due row", () => {
    expect(countOccurrences(todayTsx, 'styles["rolodex-today-due"]')).toBe(1);
    expect(todayTsx).toContain("soonestDue");
  });

  it("has no hand-rolled golden fill left in the module", () => {
    expect(todayCss).not.toContain("#dfa84a");
    expect(todayCss).not.toMatch(/linear-gradient\(\s*180deg/);
    expect(todayCss).not.toContain("#221a0c");
    expect(todayCss).not.toContain("#fdf8ec");
  });

  it("takes the primary from the shared button layer, not a second copy", () => {
    expect(chrome).toMatch(
      /\.atrium-btn-primary\s*\{[^}]*background:\s*#dfa84a/,
    );
    expect(personForm).toContain("atrium-btn-primary");
    expect(importDialog).toContain("atrium-btn");
    expect(peopleCss).not.toMatch(/\[type="submit"\]/);
  });
});

describe("the who-to-contact list keeps its density (10.5 §2)", () => {
  it("pins the row to the study's 12px padding and two text lines", () => {
    expect(rule(todayCss, "rolodex-today-hero-row")).toContain("padding: 12px");
    expect(rule(todayCss, "rolodex-today-who")).toContain(
      "flex-direction: column",
    );
  });

  it("never lets a row grow to fill the card", () => {
    const bodies = [
      ...todayCss.matchAll(/\.rolodex-today-hero-row[^{}]*\{([^}]*)\}/g),
    ].map((match) => match[1]!);
    expect(bodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      expect(body).not.toMatch(/\bflex:\s*1\b/);
      expect(body).not.toMatch(/\bheight:\s*100%/);
      expect(body).not.toMatch(/min-height/);
    }
  });

  it("clamps the cadence line to one line so a long note cannot inflate it", () => {
    const cadence = rule(todayCss, "rolodex-today-cadence");
    expect(cadence).toContain("white-space: nowrap");
    expect(cadence).toContain("overflow: hidden");
    expect(cadence).toContain("text-overflow: ellipsis");
    expect(cadence).toContain("font-family: var(--font-mono)");
    expect(cadence).toContain("font-variant-numeric: tabular-nums");
  });
});

describe("initials avatar is measured cedar, not a guess (10.5 §3)", () => {
  /*
    The spec's first cut claimed mist on raw cedar = 4.55:1 and filled the
    avatar with `--clay`. Measured, that pair is 3.29:1 (and charcoal on raw
    cedar is 3.97:1) — neither carries a 12px initial. So the fill is
    `--clay-ink` with `--bg-0` text, and the ratio is computed here from the
    shipped globals rather than asserted in a comment.
  */
  const globals = read("app/globals.css");
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((i) => {
      const s = parseInt(hex.slice(i, i + 2), 16) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const ratio = (a: string, b: string) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const token = (block: string, name: string) =>
    block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))![1].toLowerCase();
  const dark = globals.slice(0, globals.indexOf('[data-theme="light"]'));
  const light = globals.slice(globals.indexOf('[data-theme="light"]'));

  it("fills with the cedar that can carry text, not raw clay", () => {
    const avatar = rule(peopleCss, "rolodex-initials");
    expect(avatar).toContain("background: var(--clay-ink)");
    expect(avatar).toContain("color: var(--bg-0)");
  });

  it("clears 4.5:1 in both themes, computed from the shipped tokens", () => {
    for (const [theme, block] of [
      ["dark", dark],
      ["light", light],
    ] as const) {
      const measured = ratio(
        token(block, "--clay-ink"),
        token(block, "--bg-0"),
      );
      expect(
        measured,
        `${theme} avatar fill vs initials text = ${measured.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
    // The retired pair, also read from the shipped tokens: raw --clay with
    // --ink text is the fill this spec first mandated and 3.29:1 is why it was
    // dropped. Hardcoding the two hexes here would let a token change make the
    // probe lie, so both come out of globals.css.
    const retired = ratio(token(dark, "--clay"), token(dark, "--ink"));
    expect(retired, `raw cedar vs mist = ${retired.toFixed(2)}:1`).toBeLessThan(
      4.5,
    );
  });

  it("takes the fill from the stylesheet, not a per-name inline colour", () => {
    expect(initialsTsx).not.toContain("colorFromName");
    expect(initialsTsx).toContain("initialsFromName");
    expect(initialsTsx).toContain('styles["rolodex-initials"]');
  });
});

describe("circle accents step lichen → moss → cedar → golden (10.5 AC3)", () => {
  it("warms the ladder as the circle gets closer", () => {
    expect(rule(circlesCss, "columnDistant")).toContain(
      "--circle-c: var(--ink-faint)",
    );
    expect(rule(circlesCss, "columnWider")).toContain(
      "--circle-c: var(--moss)",
    );
    expect(rule(circlesCss, "columnClose")).toContain(
      "--circle-c: var(--clay)",
    );
    expect(rule(circlesCss, "columnInner")).toContain(
      "--circle-c: var(--brass)",
    );
    expect(circlesCss).toContain("border-top-color: var(--circle-c");
  });
});

describe("calendar today marker is a ring (10.5 §5)", () => {
  it("rings today in golden instead of filling the cell", () => {
    const today = rule(calendarCss, "today");
    expect(today).toMatch(/box-shadow:\s*inset/);
    expect(today).toContain("var(--brass)");
    expect(today).not.toMatch(/background/);
  });

  it("keeps the month grid on --line with mono day numerals", () => {
    expect(rule(calendarCss, "grid")).toContain("var(--line)");
    const day = rule(calendarCss, "day");
    expect(day).toContain("var(--font-mono)");
    expect(day).toContain("font-variant-numeric: tabular-nums");
  });

  it("passes today's ISO date in from the page", () => {
    expect(calendarPage).toContain("<CalendarMonth");
    expect(calendarPage).toContain("today={today}");
    expect(calendarTsx).toContain("today");
  });
});

describe("person page headings and panels", () => {
  it("sets section headings in the display face from the module", () => {
    expect(peopleCss).toContain(".rolodex-person h2");
    expect(coloredRule(peopleCss, "rolodex-person")).toContain(
      "font-family: var(--font-display)",
    );
    expect(personPage).toContain('styles["rolodex-person"]');
  });

  it("keeps readable dates in mono tabular numerals", () => {
    expect(rule(peopleCss, "rolodex-log-date")).toContain("var(--font-mono)");
    expect(peopleCss).toContain("font-variant-numeric: tabular-nums");
  });
});

describe("shared chrome, not a local copy (10.2/10.5 §7)", () => {
  it("keeps the subnav on the shared row with the golden active tab", () => {
    expect(subnavTsx).toContain("atrium-subnav");
    expect(subnavTsx).toContain("atrium-subtab");
    expect(subnavTsx).toContain("atrium-subtab-active");
    expect(chrome).toMatch(
      /\.atrium-subtab-active\s*\{[^}]*color:\s*var\(--brass\)/,
    );
  });

  it("keeps the accessible names the Playwright walk uses", () => {
    expect(todayTsx).toContain("Who to contact");
    expect(todayTsx).toContain("Log contact");
    expect(todayTsx).toContain("whoToContact.map");
    expect(todayTsx).toContain("/rolodex/people/${row.id}");
    expect(subnavTsx).toContain('label: "People"');
  });
});

describe("no espresso-era hex in the Rolodex modules", () => {
  const files: Record<string, string> = {
    "components/rolodex/today.module.css": todayCss,
    "components/rolodex/today-dashboard.tsx": todayTsx,
    "components/rolodex/today-charts.tsx": chartsTsx,
    "components/rolodex/people.module.css": peopleCss,
    "components/rolodex/circles-board.module.css": circlesCss,
    "components/rolodex/calendar-month.module.css": calendarCss,
    "components/rolodex/calendar-month.tsx": calendarTsx,
    "components/rolodex/rolodex-subnav.tsx": subnavTsx,
  };

  it.each(Object.entries(files))("%s has no espresso hex", (_name, src) => {
    for (const hex of ESPRESSO) {
      expect(src, hex).not.toContain(hex);
    }
  });

  it("leaves the espresso violet/cedar chart literals retired", () => {
    for (const src of Object.values(files)) {
      for (const hex of ["#8fae83", "#cd7258", "#a88fc0", "#dfa33c"]) {
        expect(src, hex).not.toContain(hex);
      }
    }
  });
});

/*
  10.5 review fix — the Timeline's only button lost its styling when the
  Workroom-era `.rolodex-search button { padding }` rule was deleted: it carried
  no className, so it fell off the shared `atrium-btn` layer entirely. A button
  with no class is invisible to every other test in this repo, so this gate
  scans real markup.

  Two legitimate shapes exist here and both are allowed:
   - a button with its own `className` (the shared `atrium-btn` layer), and
   - a classless button inside a container whose module rule styles `button`
     descendants (`.rolodex-row-actions button`), which is how the tables do it.
  Anything else is off the token layer.
*/
describe("every Rolodex button is on the token layer", () => {
  /*
    A naive /<button[^>]*>/ stops at the `>` inside an arrow function
    (`onClick={() => ...}`), truncating the tag before className. Scan to the
    closing `>` at brace depth 0 instead.
  */
  function buttonTags(src: string): string[] {
    const tags: string[] = [];
    let i = 0;
    while ((i = src.indexOf("<button", i)) !== -1) {
      let depth = 0;
      let j = i + 7;
      for (; j < src.length; j += 1) {
        const ch = src[j];
        if (ch === "{") depth += 1;
        else if (ch === "}") depth -= 1;
        else if (ch === ">" && depth === 0) break;
      }
      tags.push(src.slice(i, j + 1));
      i = j + 1;
    }
    return tags;
  }

  const routes = [
    "app/(authenticated)/rolodex/timeline/page.tsx",
    "app/(authenticated)/rolodex/people/page.tsx",
    "app/(authenticated)/rolodex/circles/page.tsx",
    "app/(authenticated)/rolodex/calendar/page.tsx",
  ];
  const components = readdirSync("components/rolodex")
    .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
    .map((f) => `components/rolodex/${f}`);
  const css = [
    "today.module.css",
    "people.module.css",
    "circles-board.module.css",
    "calendar-month.module.css",
    "rolodex-subnav.module.css",
  ]
    .map((f) => read(`components/rolodex/${f}`))
    .join("\n");

  /** A container class whose module styles its `button` descendants. */
  const hasDescendantButtonRule = (cls: string) =>
    new RegExp(`\\.${cls}\\s+button\\b`).test(css);

  it.each(routes)("%s classes every button", (file) => {
    for (const tag of buttonTags(read(file))) {
      expect(tag, `${file} has a <button> off the shared layer`).toContain(
        "className",
      );
    }
  });

  it.each(components)("%s styles every button", (file) => {
    const src = read(file);
    for (const tag of buttonTags(src)) {
      if (tag.includes("className")) continue;
      const before = src.slice(0, src.indexOf(tag));
      const container = [
        ...before.matchAll(/className=\{styles\["([^"]+)"\]\}/g),
      ].pop()?.[1];
      expect(
        container && hasDescendantButtonRule(container),
        `${file} renders a <button> with no className and no styled container rule`,
      ).toBeTruthy();
    }
  });
});
