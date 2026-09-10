import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const subnav = read("components/rolodex/rolodex-subnav.tsx");
const subnavCss = read("components/rolodex/rolodex-subnav.module.css");
const todayCss = read("components/rolodex/today.module.css");
const todayTsx = read("components/rolodex/today-dashboard.tsx");
const peopleCss = read("components/rolodex/people.module.css");
const circlesCss = read("components/rolodex/circles-board.module.css");
const calendarCss = read("components/rolodex/calendar-month.module.css");
const todayPage = read("app/(authenticated)/rolodex/page.tsx");
const peoplePage = read("app/(authenticated)/rolodex/people/page.tsx");

describe("Rolodex subnav", () => {
  it("uses inline SVG glyphs and the shared subtab classes", () => {
    expect(subnav).toContain("<svg");
    expect(subnav).toContain("atrium-subtab");
    expect(subnav).toContain('aria-label="Rolodex"');
  });

  it("drops the unicode glyph literals", () => {
    for (const char of ["\u2600", "\u25CF", "\u25CE", "\u25A6", "\u2261"]) {
      expect(subnav).not.toContain(char);
    }
  });

  it("keeps the rolodex- prefix and defers the active underline to the shared layer", () => {
    expect(subnavCss).toContain(".rolodex-subnav");
    expect(subnavCss).not.toContain(".atrium-subtab");
  });
});

describe("Today dashboard", () => {
  it("staggers the KPI tiles and keeps the contact-log flow", () => {
    expect(todayTsx).toContain('className="reveal"');
    expect(todayTsx).toContain("--i");
    expect(todayTsx).toContain("Log contact");
    expect(todayTsx).toContain("whoToContact.map");
  });

  it("styles tiles/panels with tokens and the accent-keyed KPI rule", () => {
    expect(todayCss).toContain("--stat-c");
    expect(todayCss).toContain("var(--font-display)");
    expect(todayCss).toContain("var(--bg-1)");
    expect(todayCss).toContain("var(--clay)");
    expect(todayCss).toContain("var(--brass)");
  });
});

describe("People / circles / calendar", () => {
  it("keeps the rolodex-status-* classes the screens interpolate", () => {
    for (const status of [
      "overdue",
      "due_soon",
      "in_touch",
      "snoozed",
      "off",
    ]) {
      expect(peopleCss).toContain(`rolodex-status-${status}`);
    }
  });

  it("styles with tokens and warm palette", () => {
    expect(peopleCss).toContain("var(--bg-1)");
    expect(peopleCss).toContain("var(--brass)");
    expect(circlesCss).toContain("--circle-c");
    expect(circlesCss).toContain("var(--moss)");
    expect(calendarCss).toContain("var(--bg-1)");
    expect(calendarCss).toContain("var(--brass)");
  });
});

describe("section pages", () => {
  it("carry the shared pagetitle", () => {
    expect(todayPage).toContain("atrium-pagetitle");
    expect(peoplePage).toContain("atrium-pagetitle");
  });
});
