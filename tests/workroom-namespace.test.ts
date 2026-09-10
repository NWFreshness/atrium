/**
 * Phase 5.7 — the Workroom namespace QA gate.
 *
 * The redesign gave every app its own CSS module set behind a prefix
 * (`crm-` / `space-` / `rolodex-` / `groove-`) and a shared `atrium-` chrome layer.
 * That only stays true by accident unless something checks it: these tests read the
 * real import graph and the real stylesheets, so a per-app module imported from
 * another app — or a shared `atrium-` rule reimplemented ad hoc in one of them —
 * fails here rather than surfacing as a mysterious restyle later.
 *
 * The third check locks the 5.6 pitfall as a rule: bare class names in a CSS module
 * are hashed, so the file must be imported as a namespace (`styles["x"]`). Only
 * `:global(...)` names survive a bare side-effect import.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const APPS = ["crm", "space", "rolodex", "groove"] as const;
type App = (typeof APPS)[number];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "test-results",
  "playwright-report",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Repo-relative paths always use forward slashes, whatever the host platform. */
const toPosix = (path: string) => path.split("\\").join("/");

/** Every source file that could import a stylesheet, as repo-relative paths. */
const sources = ["app", "components", "lib"]
  .flatMap((dir) => walk(resolve(root, dir)))
  .map((file) => ({ abs: file, rel: toPosix(relative(root, file)) }));

const read = (abs: string) => readFileSync(abs, "utf8");
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

type ModuleImport = { importer: string; spec: string; bound: boolean };

const BOUND_IMPORT =
  /^import[ \t]+([\w \t{},*]+?)[ \t]+from[ \t]+"([^"]+\.module\.css)"/gm;
const BARE_IMPORT = /^import[ \t]+"([^"]+\.module\.css)"/gm;

/** Resolve an import specifier relative to the importing file. */
function resolveSpec(importerRel: string, spec: string): string {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (spec.startsWith(".")) {
    return toPosix(relative(root, resolve(root, dirname(importerRel), spec)));
  }
  return spec;
}

function collectImports(): {
  modules: Map<string, ModuleImport[]>;
  files: Set<string>;
} {
  const modules = new Map<string, ModuleImport[]>();
  const files = new Set<string>();

  for (const { abs, rel } of sources) {
    const src = read(abs);
    const found: ModuleImport[] = [];

    for (const match of src.matchAll(BOUND_IMPORT)) {
      found.push({
        importer: rel,
        spec: resolveSpec(rel, match[2]),
        bound: true,
      });
    }
    for (const match of src.matchAll(BARE_IMPORT)) {
      found.push({
        importer: rel,
        spec: resolveSpec(rel, match[1]),
        bound: false,
      });
    }

    for (const entry of found) {
      files.add(entry.spec);
      const list = modules.get(entry.spec) ?? [];
      list.push(entry);
      modules.set(entry.spec, list);
    }
  }

  return { modules, files };
}

const { modules: importers, files: importedFiles } = collectImports();

/** The app a stylesheet belongs to, by its directory: `components/<app>/`. */
function ownerOf(modulePath: string): App | null {
  const match = /^components\/([a-z]+)\//.exec(modulePath);
  if (!match) return null;
  return (APPS as readonly string[]).includes(match[1])
    ? (match[1] as App)
    : null;
}

function owns(modulePath: string, importer: string): boolean {
  const app = ownerOf(modulePath);
  if (!app) return false;
  return (
    importer.startsWith(`components/${app}/`) ||
    importer.startsWith(`app/(authenticated)/${app}/`)
  );
}

describe("per-app CSS namespaces stay inside their app", () => {
  it("finds every app's stylesheets and their importers", () => {
    const appModules = [...importedFiles].filter(
      (file) => ownerOf(file) !== null,
    );
    expect(appModules.length).toBeGreaterThanOrEqual(4 * 4);
    for (const app of APPS) {
      expect(
        appModules.some((file) => file.startsWith(`components/${app}/`)),
        `no ${app}- stylesheet imported anywhere`,
      ).toBe(true);
    }
  });

  it("imports a per-app module only from that app's own components or routes", () => {
    const leaks: string[] = [];
    for (const [modulePath, entries] of importers) {
      if (!ownerOf(modulePath)) continue;
      for (const entry of entries) {
        if (!owns(modulePath, entry.importer)) {
          leaks.push(`${entry.importer} imports ${modulePath}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("imports the shared atrium- chrome only from the shared layer", () => {
    const entries = importers.get("components/atrium-nav.module.css") ?? [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(
        entry.importer.startsWith("components/"),
        `${entry.importer} reaches into the shared nav module`,
      ).toBe(true);
      expect(ownerOf(entry.importer)).toBeNull();
    }
  });

  it("has no orphaned stylesheet in any app", () => {
    for (const app of APPS) {
      const sheets = sources
        .map(({ rel }) => rel)
        .filter(
          (rel) =>
            rel.startsWith(`components/${app}/`) && rel.endsWith(".module.css"),
        );
      expect(sheets.length).toBeGreaterThan(0);
      for (const sheet of sheets) {
        expect(importedFiles.has(sheet), `${sheet} is never imported`).toBe(
          true,
        );
      }
    }
  });
});

describe("shared atrium- classes are consumed, never redefined per app", () => {
  const SHARED = [
    "atrium-btn",
    "atrium-field",
    "atrium-panel",
    "atrium-label",
    "atrium-chip",
    "atrium-avatar",
    "atrium-kpi",
    "atrium-subnav",
    "atrium-subtab",
    "atrium-pagetitle",
    "atrium-appcard",
  ];

  const perAppSheets = sources
    .map(({ abs, rel }) => ({ abs, rel }))
    .filter(({ rel }) => rel.endsWith(".module.css") && ownerOf(rel) !== null);

  it("defines no .atrium-* rule in a per-app module", () => {
    expect(perAppSheets.length).toBeGreaterThan(0);
    for (const { abs, rel } of perAppSheets) {
      const css = stripComments(read(abs));
      for (const name of SHARED) {
        expect(css, `${rel} redefines .${name}`).not.toMatch(
          new RegExp(`\\.${name}\\b\\s*[,{]`),
        );
      }
    }
  });

  it("keeps the shared class set declared once, in the shared layer", () => {
    const chrome = read(resolve(root, "app/workroom.css"));
    for (const name of SHARED) {
      expect(chrome, `missing .${name}`).toContain(`.${name}`);
    }
  });
});

describe("hashed module class names stay reachable through styles[...]", () => {
  it("side-effect-imports only stylesheets whose names are all :global", () => {
    const sideEffect = [...importers.values()]
      .flat()
      .filter((entry) => !entry.bound);

    expect(sideEffect.length).toBeGreaterThan(0);
    for (const entry of sideEffect) {
      const css = read(resolve(root, entry.spec));
      const bare = [
        ...stripComments(css).matchAll(/^\.([A-Za-z][\w-]*)/gm),
      ].map((match) => match[1]);
      expect(
        bare,
        `${entry.spec} is imported for side effects but declares hashed classes (${bare.slice(0, 3).join(", ")}) — they can never match`,
      ).toEqual([]);
    }
  });

  it("namespace-imports every stylesheet that declares bare class names", () => {
    for (const [modulePath, entries] of importers) {
      const css = read(resolve(root, modulePath));
      const bare = [...stripComments(css).matchAll(/^\.([A-Za-z][\w-]*)/gm)];
      if (bare.length === 0) continue;
      for (const entry of entries) {
        expect(
          entry.bound,
          `${entry.importer} must read ${modulePath} through styles[...]`,
        ).toBe(true);
      }
    }
  });
});

describe("both themes define the full Workroom token set", () => {
  const globals = read(resolve(root, "app/globals.css"));
  const COLOR_TOKENS = [
    "--bg-0",
    "--bg-1",
    "--bg-2",
    "--bg-3",
    "--line",
    "--line-strong",
    "--ink",
    "--ink-dim",
    "--ink-faint",
    "--brass",
    "--brass-bright",
    "--brass-deep",
    "--brass-soft",
    "--brass-glow",
    "--moss",
    "--clay",
    "--slate",
    "--violet",
  ];

  function block(start: string): string {
    const from = globals.indexOf(start);
    expect(from, `missing ${start}`).toBeGreaterThanOrEqual(0);
    return globals.slice(from, globals.indexOf("}", from));
  }

  it("declares every colour token in the dark :root block", () => {
    const dark = block(":root {");
    for (const token of COLOR_TOKENS) {
      expect(dark, `dark theme is missing ${token}`).toContain(`${token}:`);
    }
  });

  it("overrides every colour token for the warm-paper light theme", () => {
    const light = block('[data-theme="light"] {');
    for (const token of COLOR_TOKENS) {
      expect(light, `light theme is missing ${token}`).toContain(`${token}:`);
    }
  });

  it("keeps dark espresso and light paper apart", () => {
    expect(block(":root {")).toContain("--bg-0: #13100c");
    expect(block('[data-theme="light"] {')).toContain("--bg-0: #ece5d6");
  });
});

describe("the retired palette does not come back", () => {
  /** The two recharts surfaces; both must paint from the warm data tokens. */
  const CHART_FILES = [
    "components/crm/dashboard-charts.tsx",
    "components/rolodex/today-charts.tsx",
  ];
  const DATA_TOKENS = ["#8fae83", "#cd7258", "#8b9fc2", "#a88fc0", "#dfa33c"];

  it("paints every chart series from the Workroom data palette", () => {
    for (const file of CHART_FILES) {
      const hexes = [
        ...read(resolve(root, file)).matchAll(/#[0-9a-fA-F]{3,8}\b/g),
      ].map((match) => match[0]);
      // recharts writes SVG attributes, where var(--token) does not resolve, so the
      // palette is repeated as literals — these charts do have colours to check.
      expect(hexes.length, `${file} declares no series colour`).toBeGreaterThan(
        0,
      );
      for (const hex of hexes) {
        expect(
          DATA_TOKENS,
          `${file} paints a series with the stock ${hex}`,
        ).toContain(hex);
      }
    }
  });

  it("keeps the pre-Workroom flat surfaces out of the app", () => {
    // 0.4's theme was create-next-app's #0a0a0a / #171717 / #ededed / #ffffff pair;
    // 5.1 replaced it with the espresso/paper tokens. Test files are skipped: a
    // stylesheet test may legitimately name the values it forbids.
    const RETIRED = ["#0a0a0a", "#171717", "#ededed", "#ffffff"];
    for (const { abs, rel } of sources) {
      if (/\.test\.tsx?$/.test(rel)) continue;
      const src = stripComments(read(abs));
      for (const value of RETIRED) {
        expect(src, `${rel} still uses the retired ${value}`).not.toContain(
          value,
        );
      }
    }
  });
});
