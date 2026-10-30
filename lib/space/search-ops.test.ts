import { describe, expect, it } from "vitest";
import { createMemorySpaceStore, createPage } from "./queries";
import { searchPagesIn } from "./search-ops";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("searchPagesIn", () => {
  it("searches the session tenant and ignores a client tenantId", async () => {
    const memory = createMemorySpaceStore();
    const own = await createPage(tenantA, { title: "Home" }, memory);
    await createPage(tenantB, { title: "Home" }, memory);

    const hits = await searchPagesIn(tenantA, "home", memory);

    expect(hits).toEqual([
      { id: own.id, title: "Home", type: "page", icon: null },
    ]);
  });
});
