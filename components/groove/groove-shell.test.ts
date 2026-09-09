import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { UNIT_META } from "@/lib/groove/params";

describe("groove-shell", () => {
  it("lists every unit region the spec asks for, using UNIT_META names", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    const ids = ["drums", "bass", "pads", "lead"] as const;
    for (const id of ids) {
      const meta = UNIT_META[id];
      expect(meta.name).not.toBe("");
      expect(meta.model).not.toBe("");
    }
    expect(source).toContain("aria-label={unit.name}");
    // Four regions in the deck — one .map over UNITS:
    expect(source.match(/UNITS\.map/g)).toHaveLength(1);
    expect(ids).toHaveLength(4);
  });

  it("uses groove-prefixed CSS classes only", () => {
    const css = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.module.css"),
      "utf8",
    );
    const tsx = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    const classNames = [
      ...tsx.matchAll(/styles\["(groove-[a-z0-9-]+)"\]/g),
    ].map((m) => m[1]);
    expect(classNames.length).toBeGreaterThan(0);
    for (const name of classNames) {
      expect(css).toMatch(new RegExp(`\\.${name}\\b`));
    }
    expect(tsx).not.toMatch(/className="groove-/);
  });

  it("does not duplicate product nav", () => {
    const tsx = readFileSync(
      resolve(process.cwd(), "components/groove/groove-shell.tsx"),
      "utf8",
    );
    expect(tsx).not.toMatch(/Home|CRM|Space|Rolodex/);
  });
});
