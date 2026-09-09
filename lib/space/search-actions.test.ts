import { describe, expect, it } from "vitest";
import { createMemorySpaceRepository, createPage } from "./queries";
import { searchPagesForSession } from "./search-actions";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

const sessionA = {
  user: {
    id: "user-a",
    tenantId: tenantA,
    role: "owner" as const,
  },
};

function getSessionA() {
  return Promise.resolve(sessionA);
}

describe("searchPagesForSession", () => {
  it("searches the session tenant and ignores a client tenantId", async () => {
    const memory = createMemorySpaceRepository();
    const own = await createPage(tenantA, { title: "Home" }, memory);
    await createPage(tenantB, { title: "Home" }, memory);

    const hits = await searchPagesForSession(getSessionA, "home", memory);

    expect(hits).toEqual([
      { id: own.id, title: "Home", type: "page", icon: null },
    ]);
  });

  it("throws when unauthenticated", async () => {
    const memory = createMemorySpaceRepository();
    await expect(
      searchPagesForSession(async () => null, "home", memory),
    ).rejects.toThrow("Unauthenticated");
  });
});
