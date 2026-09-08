import { describe, expect, it } from "vitest";
import { BLOCK_TYPES } from "./constants";
import { createMemorySpaceRepository, listBlocks, listPages } from "./queries";
import { seedSpace } from "./seed";

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
    expect(demoPages.every((page) => page.icon)).toBe(true);
    expect(demoPages.every((page) => page.type === "page")).toBe(true);

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
