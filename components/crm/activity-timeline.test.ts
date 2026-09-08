import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("activity-timeline", () => {
  it("toggles done via toggleActivityDoneAction", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/crm/activity-timeline.tsx"),
      "utf8",
    );
    expect(source).toContain("toggleActivityDoneAction");
  });
});
