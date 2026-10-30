import type { BlockType } from "./constants";
import {
  createBlock,
  deleteBlock,
  insertBlockAt,
  listBlocks,
  reorderBlocks,
  requirePage,
  updateBlock,
  type Block,
  type SpaceStore,
} from "./queries";

export async function listBlocksIn(
  tenantId: string,
  pageId: string,
  repo?: SpaceStore,
): Promise<Block[]> {
  await requirePage(tenantId, pageId, repo);
  return listBlocks(tenantId, repo, { pageId });
}

export async function createBlockIn(
  tenantId: string,
  input: {
    pageId: string;
    type: BlockType;
    content?: Record<string, unknown>;
    index?: number;
  },
  repo?: SpaceStore,
): Promise<Block> {
  if (input.index === undefined) {
    return createBlock(
      tenantId,
      {
        pageId: input.pageId,
        type: input.type,
        content: input.content,
      },
      repo,
    );
  }
  return insertBlockAt(
    tenantId,
    input.pageId,
    input.index,
    { type: input.type, content: input.content },
    repo,
  );
}

export async function updateBlockIn(
  tenantId: string,
  id: string,
  input: {
    type?: BlockType;
    content?: Record<string, unknown>;
  },
  repo?: SpaceStore,
): Promise<Block | null> {
  return updateBlock(tenantId, id, input, repo);
}

export async function deleteBlockIn(
  tenantId: string,
  id: string,
  repo?: SpaceStore,
): Promise<Block | null> {
  return deleteBlock(tenantId, id, repo);
}

export async function reorderBlocksIn(
  tenantId: string,
  pageId: string,
  orderedIds: string[],
  repo?: SpaceStore,
): Promise<Block[] | null> {
  await requirePage(tenantId, pageId, repo);
  return reorderBlocks(tenantId, pageId, orderedIds, repo);
}
