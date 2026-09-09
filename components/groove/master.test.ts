import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FILTER_SPEC, MASTER_GROUPS, MASTER_PARAMS } from "@/lib/groove/params";
import { SWEEP_BARS } from "@/lib/groove/types";
import { filterLabel } from "@/lib/groove/filter";

describe("master", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/groove/master.tsx"),
    "utf8",
  );

  it("renders FILTER, SWEEP, SIDECHAIN, SEND FX, and the scope", () => {
    expect(source).toContain("FILTER_SPEC");
    expect(source).toContain("MASTER_GROUPS.map");
    expect(source).toContain("group.title");
    expect(source).toContain("<Scope");
    expect(source).toContain("groove-master-out");
    // Master groups exist in params; the panel renders each by title at
    // runtime, so we verify the data shape rather than a literal substring.
    const titles = MASTER_GROUPS.map((g) => g.title);
    expect(titles).toEqual(["FILTER", "SWEEP", "SIDECHAIN", "SEND FX"]);
  });

  it("uses filterLabel for the hero readout (OPEN / LP / HP)", () => {
    expect(source).toContain("filterLabel(p.liveFilter)");
    expect(filterLabel(0.5)).toBe("OPEN");
    expect(filterLabel(0.2)).toMatch(/^LP /);
    expect(filterLabel(0.8)).toMatch(/^HP /);
  });

  it("renders every master param spec in MASTER_GROUPS", () => {
    expect(source).toContain("group.specs.map");
    const sourceKeys = MASTER_PARAMS.map((s) => s.key);
    for (const spec of MASTER_GROUPS.flatMap((g) => g.specs)) {
      expect(sourceKeys).toContain(spec.key);
    }
  });

  it("renders a sweep meter whose length comes from SWEEP_BARS", () => {
    expect(source).toContain("SWEEP_BARS");
    expect(source).toContain("groove-sweep-meter");
    expect(SWEEP_BARS).toContain(0);
    expect(SWEEP_BARS.length).toBe(6);
  });

  it("uses the hero FILTER spec exactly", () => {
    expect(source).toContain("FILTER_SPEC");
    expect(FILTER_SPEC.label).toBe("FILTER");
    expect(FILTER_SPEC.kind).toBe("knob");
  });
});
