import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const shellTsx = read("components/groove/groove-shell.tsx");
const shellCss = read("components/groove/groove-shell.module.css");
/** comments stripped: assertions about live rules must not trip on prose */
const shellRules = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
const transport = read("components/groove/transport.tsx");
const unit = read("components/groove/unit.tsx");
const master = read("components/groove/master.tsx");
const scopeTsx = read("components/groove/scope.tsx");
const page = read("app/(authenticated)/groove/page.tsx");
const smoke = read("e2e/groove.spec.ts");

/** every component that paints the desk */
const desk = [
  "groove-shell",
  "transport",
  "unit",
  "master",
  "scope",
  "knob",
  "fader",
  "led-strip",
  "drum-grid",
  "note-grid",
  "velocity-lane",
].map((file) => ({ file, src: read(`components/groove/${file}.tsx`) }));

describe("Groove desk class namespace", () => {
  it("declares the groove- DOM names global instead of hashing them", () => {
    // The smoke test selects bare DOM class names (".groove-master-leds .groove-led")
    // and toggles "on"/"muted" by substring, so these names are a public contract:
    // hashing them through styles[...] would silently break e2e/groove.spec.ts.
    expect(shellCss).toContain(":global(.groove-shell)");
    expect(shellCss).toContain(":global(.groove-unit)");
    expect(shellCss).toContain(":global(.groove-master-leds)");
    expect(shellTsx).toContain('import "./groove-shell.module.css"');

    for (const { file, src } of desk) {
      expect(src, `${file} must not hash its class names`).not.toContain(
        "styles[",
      );
    }
  });

  it("only ever names classes in the groove- namespace", () => {
    const bare = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
    const names = [...bare.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(40);
    for (const name of names) {
      expect(name, `${name} is not groove- prefixed`).toMatch(/^groove-/);
    }
  });

  it("keeps the smoke's DOM hooks", () => {
    expect(smoke).toContain(".groove-master-leds .groove-led");
    expect(transport).toContain('className="groove-master-leds"');
    expect(unit).toContain("groove-unit-muted");
    expect(shellCss).toContain(":global(.groove-led)");
    expect(shellCss).toContain(":global(.groove-led-on)");
    expect(shellCss).toContain(":global(.groove-unit-muted)");
  });
});

describe("Groove keeps its own dark instrument tokens", () => {
  it("never re-skins for the light theme", () => {
    expect(shellRules).not.toContain('[data-theme="light"]');
    expect(shellCss).toContain("--inst-panel");
    expect(shellCss).toContain("--inst-line");
    expect(shellCss).toContain("--inst-ink");
  });

  it("reuses the shared display/mono faces for readouts", () => {
    expect(shellCss).toContain("var(--font-display)");
    expect(shellCss).toContain("var(--font-mono)");
  });
});

describe("Groove chassis", () => {
  it("wraps the desk in a named hardware chassis with screws", () => {
    expect(shellTsx).toContain('role="group"');
    expect(shellTsx).toContain('aria-label="Groovebox G-4"');
    expect(shellTsx).toContain("groove-nameplate");
    expect(shellTsx).toContain("Groovebox G-4");
    const screws = shellTsx.match(/groove-screw/g) ?? [];
    expect(screws.length).toBeGreaterThanOrEqual(4);
    expect(shellTsx).toContain('aria-hidden="true"');
  });

  it("gives the transport a live play indicator and a tempo readout", () => {
    expect(transport).toContain("groove-play-led");
    expect(transport).toContain("groove-tempo-value");
    expect(shellCss).toContain(":global(.groove-play-led)");
    expect(shellCss).toContain(":global(.groove-nameplate)");
  });

  it("meters the master output against the live analyser", () => {
    expect(master).toContain("groove-vu");
    expect(master).toContain("getByteTimeDomainData");
    expect(scopeTsx).toContain('role="img"');
  });
});

describe("Groove domain stays frozen", () => {
  it("keeps the prototype's stand-in names out of the app", () => {
    for (const fake of ["BOOM BAP", "HOUSE", "LATIN", "DUB"]) {
      expect(transport, `${fake} is prototype-only`).not.toContain(fake);
    }
    expect(transport).toContain("p.patches.map");
    expect(unit).toContain("UNIT_META[id]");
  });

  it("never touches the database", () => {
    for (const { file, src } of desk) {
      expect(src, `${file} must stay DB-free`).not.toContain("lib/db");
    }
    expect(page).not.toContain("lib/db");
  });
});

describe("Groove page chrome", () => {
  it("titles the page like the other apps", () => {
    expect(page).toContain("atrium-pagetitle");
    expect(page).toContain("<h1");
    expect(page).not.toContain("groove-sr-only");
    expect(page).toContain('aria-label="Groove"');
  });
});
