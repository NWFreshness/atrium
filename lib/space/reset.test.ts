import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDemoResetters,
  registerDemoResetter,
  resetDemo,
} from "../tenancy/reset-demo";
import {
  createMemorySpaceRepository,
  createPage,
  listPages,
  type SpaceRepository,
} from "./queries";
import { registerSpaceDemoResetter, resetSpace } from "./reset";
import { seedSpace } from "./seed";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: demoTenant,
    role: "demo" as const,
  },
};

function cloneRepo(repo: SpaceRepository): SpaceRepository {
  return {
    pages: repo.pages.map((row) => ({ ...row })),
    blocks: repo.blocks.map((row) => ({ ...row })),
    properties: repo.properties.map((row) => ({ ...row })),
    propertyOptions: repo.propertyOptions.map((row) => ({ ...row })),
    rowValues: repo.rowValues.map((row) => ({ ...row })),
    views: repo.views.map((row) => ({ ...row })),
  };
}

function commitRepo(target: SpaceRepository, source: SpaceRepository): void {
  target.pages.splice(0, target.pages.length, ...source.pages);
  target.blocks.splice(0, target.blocks.length, ...source.blocks);
  target.properties.splice(0, target.properties.length, ...source.properties);
  target.propertyOptions.splice(
    0,
    target.propertyOptions.length,
    ...source.propertyOptions,
  );
  target.rowValues.splice(0, target.rowValues.length, ...source.rowValues);
  target.views.splice(0, target.views.length, ...source.views);
}

describe("resetSpace", () => {
  it("wipes then reseeds the demo tenant", async () => {
    const repo = createMemorySpaceRepository();
    await seedSpace(demoTenant, repo);
    await createPage(demoTenant, { title: "Stale Scratch" }, repo);
    const seededTitles = (await listPages(demoTenant, repo))
      .filter((page) => page.title !== "Stale Scratch")
      .map((page) => page.title)
      .sort();

    await resetSpace(undefined, demoTenant, repo);

    const pages = await listPages(demoTenant, repo);
    expect(pages.map((page) => page.title).sort()).toEqual(seededTitles);
    expect(pages.some((page) => page.title === "Stale Scratch")).toBe(false);
  });

  it("does not change the owner tenant", async () => {
    const repo = createMemorySpaceRepository();
    await seedSpace(demoTenant, repo);
    await createPage(ownerTenant, { title: "Owner Notes" }, repo);

    await resetSpace(undefined, demoTenant, repo);

    const ownerPages = await listPages(ownerTenant, repo);
    expect(ownerPages.map((page) => page.title)).toEqual(["Owner Notes"]);
  });

  it("throws when no memory repo and no DATABASE_URL", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(resetSpace(undefined, demoTenant)).rejects.toThrow(
        "Space store required",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});

describe("registerSpaceDemoResetter", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("rolls back when a resetter throws inside injected runInTransaction", async () => {
    const committed = createMemorySpaceRepository();
    await seedSpace(demoTenant, committed);
    await createPage(demoTenant, { title: "Stale Scratch" }, committed);

    async function runInTransaction(
      work: (tx: SpaceRepository) => Promise<void>,
    ): Promise<void> {
      const tx = cloneRepo(committed);
      try {
        await work(tx);
        commitRepo(committed, tx);
      } catch (error) {
        throw error;
      }
    }

    registerSpaceDemoResetter(committed);
    registerDemoResetter(async () => {
      throw new Error("resetter failed");
    });

    await expect(
      resetDemo(async () => demoSession, { runInTransaction }),
    ).rejects.toThrow("resetter failed");

    const pages = await listPages(demoTenant, committed);
    expect(pages.some((page) => page.title === "Stale Scratch")).toBe(true);
  });
});
