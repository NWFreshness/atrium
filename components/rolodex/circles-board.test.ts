import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CirclesBoard", () => {
  it("uses @hello-pangea/dnd and movePersonCircleAction", () => {
    const source = readFileSync(
      new URL("./circles-board.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("@hello-pangea/dnd");
    expect(source).toContain("movePersonCircleAction");
    expect(source).toContain("Droppable");
  });
});
