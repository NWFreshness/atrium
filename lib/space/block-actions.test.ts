import { describe, expect, it } from "vitest";
import {
  createBlockForSession,
  deleteBlockForSession,
  listBlocksForSession,
  reorderBlocksForSession,
  updateBlockForSession,
} from "./block-actions";
import { createPageForSession } from "./page-actions";
import {
  createBlock,
  createMemorySpaceRepository,
  createPage,
  getBlock,
} from "./queries";

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

describe("block session actions", () => {
  it("creates, updates, reorders, and deletes using the session tenantId", async () => {
    const memory = createMemorySpaceRepository();
    const page = await createPageForSession(
      getSessionA,
      { title: "Home", tenantId: tenantB },
      memory,
    );

    const first = await createBlockForSession(
      getSessionA,
      {
        pageId: page.id,
        type: "paragraph",
        content: { text: "one" },
        tenantId: tenantB,
      },
      memory,
    );
    const second = await createBlockForSession(
      getSessionA,
      {
        pageId: page.id,
        type: "heading1",
        content: { text: "two" },
      },
      memory,
    );

    expect(first.tenantId).toBe(tenantA);
    expect(second.position).toBe(1);

    const updated = await updateBlockForSession(
      getSessionA,
      first.id,
      { content: { text: "edited" }, tenantId: tenantB },
      memory,
    );
    expect(updated?.content).toEqual({ text: "edited" });
    expect(updated?.tenantId).toBe(tenantA);

    const reordered = await reorderBlocksForSession(
      getSessionA,
      page.id,
      [second.id, first.id],
      { tenantId: tenantB },
      memory,
    );
    expect(reordered?.map((block) => block.id)).toEqual([second.id, first.id]);
    expect(reordered?.map((block) => block.position)).toEqual([0, 1]);

    const deleted = await deleteBlockForSession(getSessionA, first.id, memory);
    expect(deleted?.id).toBe(first.id);
    expect(
      (await listBlocksForSession(getSessionA, page.id, {}, memory)).map(
        (block) => block.id,
      ),
    ).toEqual([second.id]);
  });

  it("inserts a block at an index and shifts later blocks", async () => {
    const memory = createMemorySpaceRepository();
    const page = await createPageForSession(
      getSessionA,
      { title: "Home" },
      memory,
    );
    const first = await createBlockForSession(
      getSessionA,
      { pageId: page.id, type: "paragraph", content: { text: "a" } },
      memory,
    );
    const third = await createBlockForSession(
      getSessionA,
      { pageId: page.id, type: "paragraph", content: { text: "c" } },
      memory,
    );
    const inserted = await createBlockForSession(
      getSessionA,
      {
        pageId: page.id,
        type: "paragraph",
        content: { text: "b" },
        index: 1,
      },
      memory,
    );

    const listed = await listBlocksForSession(getSessionA, page.id, {}, memory);
    expect(listed.map((block) => block.id)).toEqual([
      first.id,
      inserted.id,
      third.id,
    ]);
  });

  it("does not let another tenant write blocks", async () => {
    const memory = createMemorySpaceRepository();
    const otherPage = await createPage(tenantB, { title: "Beta" }, memory);
    const otherBlock = await createBlock(
      tenantB,
      { pageId: otherPage.id, type: "paragraph", content: { text: "secret" } },
      memory,
    );

    await expect(
      createBlockForSession(
        getSessionA,
        { pageId: otherPage.id, type: "paragraph" },
        memory,
      ),
    ).rejects.toThrow("Page not found");

    expect(
      await updateBlockForSession(
        getSessionA,
        otherBlock.id,
        { content: { text: "hacked" } },
        memory,
      ),
    ).toBeNull();
    expect(
      await deleteBlockForSession(getSessionA, otherBlock.id, memory),
    ).toBeNull();
    await expect(
      reorderBlocksForSession(
        getSessionA,
        otherPage.id,
        [otherBlock.id],
        {},
        memory,
      ),
    ).rejects.toThrow("Page not found");
    expect(await getBlock(tenantB, otherBlock.id, memory)).toMatchObject({
      content: { text: "secret" },
    });
  });

  it("rejects a reorder that is not a permutation of the page's blocks", async () => {
    const memory = createMemorySpaceRepository();
    const page = await createPageForSession(
      getSessionA,
      { title: "Home" },
      memory,
    );
    const block = await createBlockForSession(
      getSessionA,
      { pageId: page.id, type: "paragraph" },
      memory,
    );

    expect(
      await reorderBlocksForSession(
        getSessionA,
        page.id,
        [block.id, "missing"],
        {},
        memory,
      ),
    ).toBeNull();
  });
});
