"use server";

import { requireTenant, type GetSession } from "../tenancy";
import type { BlockType } from "./constants";
import {
  createBlock,
  deleteBlock,
  getPage,
  insertBlockAt,
  listBlocks,
  reorderBlocks,
  updateBlock,
  type Block,
  type SpaceRepository,
} from "./queries";

type ClientTenantInput = {
  tenantId?: string;
};

async function requirePage(
  tenantId: string,
  pageId: string,
  repo?: SpaceRepository,
) {
  const page = await getPage(tenantId, pageId, repo);
  if (!page) {
    throw new Error("Page not found");
  }
  return page;
}

export async function listBlocksForSession(
  getSession: GetSession,
  pageId: string,
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Block[]> {
  const { tenantId } = await requireTenant(getSession, input);
  await requirePage(tenantId, pageId, repo);
  return listBlocks(tenantId, repo, { pageId });
}

export async function createBlockForSession(
  getSession: GetSession,
  input: {
    pageId: string;
    type: BlockType;
    content?: Record<string, unknown>;
    index?: number;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<Block> {
  const { tenantId } = await requireTenant(getSession, input);
  await requirePage(tenantId, input.pageId, repo);
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

export async function updateBlockForSession(
  getSession: GetSession,
  id: string,
  input: {
    type?: BlockType;
    content?: Record<string, unknown>;
  } & ClientTenantInput,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const { tenantId } = await requireTenant(getSession, input);
  return updateBlock(tenantId, id, input, repo);
}

export async function deleteBlockForSession(
  getSession: GetSession,
  id: string,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const { tenantId } = await requireTenant(getSession);
  return deleteBlock(tenantId, id, repo);
}

export async function reorderBlocksForSession(
  getSession: GetSession,
  pageId: string,
  orderedIds: string[],
  input: ClientTenantInput = {},
  repo?: SpaceRepository,
): Promise<Block[] | null> {
  const { tenantId } = await requireTenant(getSession, input);
  await requirePage(tenantId, pageId, repo);
  return reorderBlocks(tenantId, pageId, orderedIds, repo);
}

export async function listBlocksAction(pageId: string): Promise<Block[]> {
  const { auth } = await import("@/auth");
  return listBlocksForSession(auth, pageId);
}

export async function createBlockAction(input: {
  pageId: string;
  type: BlockType;
  content?: Record<string, unknown>;
  index?: number;
}): Promise<Block> {
  const { auth } = await import("@/auth");
  return createBlockForSession(auth, input);
}

export async function updateBlockAction(
  id: string,
  input: { type?: BlockType; content?: Record<string, unknown> },
): Promise<Block | null> {
  const { auth } = await import("@/auth");
  return updateBlockForSession(auth, id, input);
}

export async function deleteBlockAction(id: string): Promise<Block | null> {
  const { auth } = await import("@/auth");
  return deleteBlockForSession(auth, id);
}

export async function reorderBlocksAction(
  pageId: string,
  orderedIds: string[],
): Promise<Block[] | null> {
  const { auth } = await import("@/auth");
  return reorderBlocksForSession(auth, pageId, orderedIds);
}
