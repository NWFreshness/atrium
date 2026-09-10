import { describe, expect, it } from "vitest";
import { BLOCK_TYPES } from "./constants";
import {
  createMemorySpaceRepository,
  listBlocks,
  listPages,
  listProperties,
  listPropertyOptions,
  listViews,
} from "./queries";
import { seedSpace } from "./seed";
import { parseViewConfig } from "./view-logic";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

describe("seedSpace", () => {
  it("populates the demo tenant with a nested icon tree and leaves owner empty", async () => {
    const repo = createMemorySpaceRepository();

    await seedSpace(demoTenant, repo);

    const demoPages = await listPages(demoTenant, repo);
    const ownerPages = await listPages(ownerTenant, repo);
    const titles = demoPages.map((page) => page.title);

    expect(titles).toEqual(
      expect.arrayContaining([
        "Home",
        "Projects",
        "Balcony Garden",
        "Planting Calendar",
        "Travel",
        "Japan 2026",
        "Kyoto Notes",
      ]),
    );
    expect(
      demoPages
        .filter((page) => page.type !== "row")
        .every((page) => page.icon),
    ).toBe(true);

    const projects = demoPages.find((page) => page.title === "Projects");
    const garden = demoPages.find((page) => page.title === "Balcony Garden");
    const calendar = demoPages.find(
      (page) => page.title === "Planting Calendar",
    );
    expect(projects?.parentId).toBeNull();
    expect(garden?.parentId).toBe(projects?.id);
    expect(calendar?.parentId).toBe(garden?.id);

    expect(ownerPages).toEqual([]);
  });

  it("seeds every block type onto the Home page", async () => {
    const repo = createMemorySpaceRepository();
    await seedSpace(demoTenant, repo);
    const home = (await listPages(demoTenant, repo)).find(
      (page) => page.title === "Home",
    );
    expect(home).toBeDefined();
    const blocks = await listBlocks(demoTenant, repo, { pageId: home!.id });
    expect(new Set(blocks.map((block) => block.type))).toEqual(
      new Set(BLOCK_TYPES),
    );
  });

  it("seeds Trip Planner with five rows and a Reading List database", async () => {
    const repo = createMemorySpaceRepository();
    await seedSpace(demoTenant, repo);
    const pages = await listPages(demoTenant, repo);
    const trip = pages.find((page) => page.title === "Trip Planner");
    const reading = pages.find((page) => page.title === "Reading List");
    expect(trip?.type).toBe("database");
    expect(reading?.type).toBe("database");
    const tripRows = pages.filter(
      (page) => page.parentId === trip?.id && page.type === "row",
    );
    expect(tripRows).toHaveLength(5);
    expect(tripRows.map((row) => row.title)).toEqual(
      expect.arrayContaining(["Japan, ten days", "Scottish Highlands"]),
    );

    const properties = await listProperties(demoTenant, repo, {
      databaseId: trip!.id,
    });
    const status = properties.find((property) => property.name === "Status");
    const budget = properties.find((property) => property.name === "Budget");
    const planning = (await listPropertyOptions(demoTenant, repo)).find(
      (option) =>
        option.propertyId === status?.id && option.name === "Planning",
    );
    const views = await listViews(demoTenant, repo, { databaseId: trip!.id });
    const byKind = Object.fromEntries(
      views.map((view) => [view.kind, parseViewConfig(view.config)]),
    );
    expect(byKind.board?.groupPropertyId).toBe(status?.id);
    expect(byKind.table?.sort).toEqual({
      propertyId: budget?.id,
      direction: "desc",
    });
    expect(byKind.list?.filters).toEqual([
      { propertyId: status?.id, operator: "is", value: planning?.id },
    ]);
  });

  it("is a no-op when the tenant already has Space pages", async () => {
    const repo = createMemorySpaceRepository();

    await seedSpace(demoTenant, repo);
    const afterFirst = (await listPages(demoTenant, repo)).length;

    await seedSpace(demoTenant, repo);
    const afterSecond = (await listPages(demoTenant, repo)).length;

    expect(afterFirst).toBeGreaterThan(0);
    expect(afterSecond).toBe(afterFirst);
  });
});

/**
 * A demo workspace whose pages are all blank reads as a broken app, not an empty
 * one: the page route self-creates a single empty paragraph for any page with no
 * blocks, so a visitor sees the same blank editor everywhere. These pin the
 * content depth the seed is expected to ship.
 */
describe("seedSpace content depth", () => {
  async function seededPages() {
    const repo = createMemorySpaceRepository();
    await seedSpace(demoTenant, repo);
    return { repo, pages: await listPages(demoTenant, repo) };
  }

  it("gives every seeded page real content, so no page opens blank", async () => {
    const { repo, pages } = await seededPages();
    const contentPages = pages.filter((page) => page.type === "page");
    expect(contentPages.length).toBeGreaterThanOrEqual(30);

    const blank: string[] = [];
    for (const page of contentPages) {
      const blocks = await listBlocks(demoTenant, repo, { pageId: page.id });
      if (blocks.filter((block) => block.type !== "divider").length === 0) {
        blank.push(page.title);
      }
    }
    expect(blank).toEqual([]);
  });

  it("writes text into every seeded block (dividers carry none by design)", async () => {
    const { repo, pages } = await seededPages();
    const offenders: string[] = [];

    for (const page of pages.filter((page) => page.type === "page")) {
      const blocks = await listBlocks(demoTenant, repo, { pageId: page.id });
      for (const block of blocks) {
        if (block.type === "divider") continue;
        const { text } = block.content as { text?: unknown };
        if (typeof text !== "string" || text.trim() === "") {
          offenders.push(`${page.title}:${block.type}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("seeds a Reading List worth opening, with ratings and progress", async () => {
    const { repo, pages } = await seededPages();
    const reading = pages.find((page) => page.title === "Reading List");
    expect(reading).toBeDefined();

    const rows = pages.filter(
      (page) => page.parentId === reading!.id && page.type === "row",
    );
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows.map((row) => row.title)).toEqual(
      expect.arrayContaining(["Dune"]),
    );

    const properties = await listProperties(demoTenant, repo, {
      databaseId: reading!.id,
    });
    expect(properties.map((property) => property.name)).toEqual(
      expect.arrayContaining(["Author", "Status", "Rating"]),
    );
  });
});
