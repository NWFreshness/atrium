import { describe, expect, it } from "vitest";
import {
  createMemorySpaceRepository,
  createPage,
} from "./queries";
import { searchPages } from "./search";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("searchPages", () => {
  it("throws when tenantId is missing or empty", async () => {
    const memory = createMemorySpaceRepository();
    await expect(searchPages("", "home", memory)).rejects.toThrow(/tenantId/);
    await expect(searchPages("  ", "home", memory)).rejects.toThrow(/tenantId/);
  });

  it("returns [] for empty or whitespace queries", async () => {
    const memory = createMemorySpaceRepository();
    await createPage(tenantA, { title: "Home" }, memory);

    expect(await searchPages(tenantA, "", memory)).toEqual([]);
    expect(await searchPages(tenantA, "   ", memory)).toEqual([]);
  });

  it("matches titles case-insensitively by substring across page, database, and row", async () => {
    const memory = createMemorySpaceRepository();
    const page = await createPage(
      tenantA,
      { title: "Home base", type: "page", icon: "🏠" },
      memory,
    );
    const database = await createPage(
      tenantA,
      { title: "Trip Planner", type: "database", icon: "🗺" },
      memory,
    );
    const row = await createPage(
      tenantA,
      { title: "Japan, ten days", type: "row", parentId: database.id },
      memory,
    );
    await createPage(tenantA, { title: "Unrelated", type: "page" }, memory);

    const homeHits = await searchPages(tenantA, "HoMe", memory);
    expect(homeHits).toEqual([
      { id: page.id, title: "Home base", type: "page", icon: "🏠" },
    ]);

    const tripHits = await searchPages(tenantA, "trip", memory);
    expect(tripHits).toEqual([
      {
        id: database.id,
        title: "Trip Planner",
        type: "database",
        icon: "🗺",
      },
    ]);

    const japanHits = await searchPages(tenantA, "JAPAN", memory);
    expect(japanHits).toEqual([
      { id: row.id, title: "Japan, ten days", type: "row", icon: null },
    ]);
  });

  it("never returns another tenant's pages", async () => {
    const memory = createMemorySpaceRepository();
    await createPage(tenantB, { title: "Demo Home" }, memory);
    const own = await createPage(tenantA, { title: "Demo Home" }, memory);

    const hits = await searchPages(tenantA, "demo", memory);
    expect(hits).toEqual([
      { id: own.id, title: "Demo Home", type: "page", icon: null },
    ]);
  });

  it("sorts matches by title then id", async () => {
    const memory = createMemorySpaceRepository();
    const zebra = await createPage(
      tenantA,
      { title: "Alpha", type: "page" },
      memory,
    );
    const beta = await createPage(
      tenantA,
      { title: "Beta note", type: "page" },
      memory,
    );
    const alphaSame = await createPage(
      tenantA,
      { title: "Alpha", type: "database" },
      memory,
    );

    const hits = await searchPages(tenantA, "a", memory);
    const expectedIds = [zebra, alphaSame]
      .sort((left, right) =>
        left.title === right.title
          ? left.id < right.id
            ? -1
            : left.id > right.id
              ? 1
              : 0
          : left.title < right.title
            ? -1
            : 1,
      )
      .map((row) => row.id);
    expectedIds.push(beta.id);

    expect(hits.map((hit) => hit.id)).toEqual(expectedIds);
    expect(hits.map((hit) => hit.title)).toEqual(["Alpha", "Alpha", "Beta note"]);
  });
});
