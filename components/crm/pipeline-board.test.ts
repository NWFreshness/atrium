import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("pipeline-board", () => {
  it("uses @hello-pangea/dnd and moveDealAction", () => {
    const source = readFileSync(
      resolve(process.cwd(), "components/crm/pipeline-board.tsx"),
      "utf8",
    );
    expect(source).toContain("DragDropContext");
    expect(source).toContain("moveDealAction");
  });
});
