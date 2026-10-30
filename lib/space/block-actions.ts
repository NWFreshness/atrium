"use server";

import { sessionTenant } from "../tenancy";
import type { BlockType } from "./constants";
import { type Block } from "./queries";

import {
  listBlocksIn,
  createBlockIn,
  updateBlockIn,
  deleteBlockIn,
  reorderBlocksIn,
} from "./block-ops";

export async function listBlocksAction(pageId: string): Promise<Block[]> {
  return listBlocksIn(await sessionTenant(), pageId);
}

export async function createBlockAction(input: {
  pageId: string;
  type: BlockType;
  content?: Record<string, unknown>;
  index?: number;
}): Promise<Block> {
  return createBlockIn(await sessionTenant(), input);
}

export async function updateBlockAction(
  id: string,
  input: { type?: BlockType; content?: Record<string, unknown> },
): Promise<Block | null> {
  return updateBlockIn(await sessionTenant(), id, input);
}

export async function deleteBlockAction(id: string): Promise<Block | null> {
  return deleteBlockIn(await sessionTenant(), id);
}

export async function reorderBlocksAction(
  pageId: string,
  orderedIds: string[],
): Promise<Block[] | null> {
  return reorderBlocksIn(await sessionTenant(), pageId, orderedIds);
}
