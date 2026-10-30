import { describe, expect, it } from "vitest";
import {
  createBlockIn,
  deleteBlockIn,
  listBlocksIn,
  reorderBlocksIn,
  updateBlockIn,
} from "./block-ops";
import { createPageIn } from "./page-ops";
import {
  createBlock,
  createMemorySpaceStore,
  createPage,
  deleteBlock,
  getBlock,
  listBlocks,
  type SpaceStore,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

/** These tests count blocks from zero; a new page now opens with one. */
async function clearOpeningBlock(memory: SpaceStore, pageId: string) {
  for (const block of await listBlocks(tenantA, memory, { pageId })) {
    await deleteBlock(tenantA, block.id, memory);
  }
}

describe("block session actions", () => {
  it("creates, updates, reorders, and deletes using the session tenantId", async () => {
    const memory = createMemorySpaceStore();
    const page = await createPageIn(tenantA, { title: "Home" }, memory);
    await clearOpeningBlock(memory, page.id);

    const first = await createBlockIn(
      tenantA,
      {
        pageId: page.id,
        type: "paragraph",
        content: { text: "one" },
      },
      memory,
    );
    const second = await createBlockIn(
      tenantA,
      {
        pageId: page.id,
        type: "heading1",
        content: { text: "two" },
      },
      memory,
    );

    expect(first.tenantId).toBe(tenantA);
    expect(second.position).toBe(1);

    const updated = await updateBlockIn(
      tenantA,
      first.id,
      { content: { text: "edited" } },
      memory,
    );
    expect(updated?.content).toEqual({ text: "edited" });
    expect(updated?.tenantId).toBe(tenantA);

    const reordered = await reorderBlocksIn(
      tenantA,
      page.id,
      [second.id, first.id],
      memory,
    );
    expect(reordered?.map((block) => block.id)).toEqual([second.id, first.id]);
    expect(reordered?.map((block) => block.position)).toEqual([0, 1]);

    const deleted = await deleteBlockIn(tenantA, first.id, memory);
    expect(deleted?.id).toBe(first.id);
    expect(
      (await listBlocksIn(tenantA, page.id, memory)).map((block) => block.id),
    ).toEqual([second.id]);
  });

  it("inserts a block at an index and shifts later blocks", async () => {
    const memory = createMemorySpaceStore();
    const page = await createPageIn(tenantA, { title: "Home" }, memory);
    await clearOpeningBlock(memory, page.id);
    const first = await createBlockIn(
      tenantA,
      { pageId: page.id, type: "paragraph", content: { text: "a" } },
      memory,
    );
    const third = await createBlockIn(
      tenantA,
      { pageId: page.id, type: "paragraph", content: { text: "c" } },
      memory,
    );
    const inserted = await createBlockIn(
      tenantA,
      {
        pageId: page.id,
        type: "paragraph",
        content: { text: "b" },
        index: 1,
      },
      memory,
    );

    const listed = await listBlocksIn(tenantA, page.id, memory);
    expect(listed.map((block) => block.id)).toEqual([
      first.id,
      inserted.id,
      third.id,
    ]);
  });

  it("does not let another tenant write blocks", async () => {
    const memory = createMemorySpaceStore();
    const otherPage = await createPage(tenantB, { title: "Beta" }, memory);
    const otherBlock = await createBlock(
      tenantB,
      { pageId: otherPage.id, type: "paragraph", content: { text: "secret" } },
      memory,
    );

    await expect(
      createBlockIn(
        tenantA,
        { pageId: otherPage.id, type: "paragraph" },
        memory,
      ),
    ).rejects.toThrow("Page not found");

    expect(
      await updateBlockIn(
        tenantA,
        otherBlock.id,
        { content: { text: "hacked" } },
        memory,
      ),
    ).toBeNull();
    expect(await deleteBlockIn(tenantA, otherBlock.id, memory)).toBeNull();
    await expect(
      reorderBlocksIn(tenantA, otherPage.id, [otherBlock.id], memory),
    ).rejects.toThrow("Page not found");
    expect(await getBlock(tenantB, otherBlock.id, memory)).toMatchObject({
      content: { text: "secret" },
    });
  });

  it("rejects a reorder that is not a permutation of the page's blocks", async () => {
    const memory = createMemorySpaceStore();
    const page = await createPageIn(tenantA, { title: "Home" }, memory);
    const block = await createBlockIn(
      tenantA,
      { pageId: page.id, type: "paragraph" },
      memory,
    );

    expect(
      await reorderBlocksIn(tenantA, page.id, [block.id, "missing"], memory),
    ).toBeNull();
  });
});
