import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Vercel Web Analytics is one dependency and one mount, and both are invisible to
 * every other test in the repo: the component renders `null`, so nothing in the
 * rendered HTML (or in Playwright) can tell a working mount from a missing one.
 *
 * What this locks:
 *  1. the package is a runtime dependency, not a dev one — it ships to the browser;
 *  2. the root layout is the only mount site, so a page cannot get a second client
 *     boundary (or a double pageview) by importing it again;
 *  3. the mount sits inside <body> in `app/layout.tsx`, which is the only layout
 *     that wraps the login screen as well as the authenticated apps.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(`${root}/${p}`, "utf8");

const SPECIFIER = "@vercel/analytics/next";

/** Every .ts/.tsx under the given dirs, minus tests. */
function sourceFiles(dirs: string[]): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(root, dir))) {
      const relative = `${dir}/${entry}`;
      if (statSync(join(root, relative)).isDirectory()) {
        walk(relative);
      } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
        files.push(relative);
      }
    }
  };
  for (const dir of dirs) {
    walk(dir);
  }
  return files;
}

describe("Vercel Web Analytics", () => {
  it("ships as a runtime dependency", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies["@vercel/analytics"]).toBeDefined();
    expect(pkg.devDependencies["@vercel/analytics"]).toBeUndefined();
  });

  it("is imported by the root layout and nothing else", () => {
    const importers = sourceFiles(["app", "components", "lib"]).filter((file) =>
      read(file).includes(SPECIFIER),
    );
    expect(importers).toEqual(["app/layout.tsx"]);
  });

  it("mounts <Analytics /> inside the root layout body", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain(`import { Analytics } from "${SPECIFIER}";`);

    const body = layout.slice(
      layout.indexOf("<body>"),
      layout.indexOf("</body>"),
    );
    expect(body).toContain("<Analytics />");
    // A mount inside <head> would be outside the rendered tree React hydrates.
    expect(layout.slice(0, layout.indexOf("<body>"))).not.toContain(
      "<Analytics",
    );
  });

  it("is unmounted in no layout other than the root one", () => {
    const mounts = sourceFiles(["app", "components"]).filter((file) =>
      read(file).includes("<Analytics"),
    );
    expect(mounts).toEqual(["app/layout.tsx"]);
  });
});
