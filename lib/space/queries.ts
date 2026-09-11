import type { WriteOpts } from "../db/batch-transaction";
import { assertText, MAX_BLOCK_TEXT, MAX_SHORT_TEXT } from "../input/text";
import type { ViewKind } from "./constants";
import {
  createBlockInMemory,
  createPageInMemory,
  createPropertyInMemory,
  createPropertyOptionInMemory,
  createRowValueInMemory,
  createViewInMemory,
  deleteBlockInMemory,
  deletePageInMemory,
  deletePropertyInMemory,
  deletePropertyOptionInMemory,
  deleteRowValueInMemory,
  deleteViewInMemory,
  getBlockInMemory,
  getPageInMemory,
  getPropertyInMemory,
  getPropertyOptionInMemory,
  getRowValueInMemory,
  getViewInMemory,
  listBlocksInMemory,
  listPagesInMemory,
  listPropertiesInMemory,
  listPropertyOptionsInMemory,
  listRowValuesInMemory,
  listViewsInMemory,
  nextBlockPositionInMemory,
  nextPagePositionInMemory,
  nextPropertyOptionPositionInMemory,
  nextPropertyPositionInMemory,
  updateBlockInMemory,
  updatePageInMemory,
  updatePropertyInMemory,
  updatePropertyOptionInMemory,
  updateRowValueInMemory,
  updateViewInMemory,
} from "./queries-memory";
import {
  deleteBlockInDrizzle,
  deletePageInDrizzle,
  deletePropertyInDrizzle,
  deletePropertyOptionInDrizzle,
  deleteRowValueInDrizzle,
  deleteViewInDrizzle,
  getBlockInDrizzle,
  getPageInDrizzle,
  getPropertyInDrizzle,
  getPropertyOptionInDrizzle,
  getRowValueInDrizzle,
  getViewInDrizzle,
  insertBlock,
  insertPage,
  insertProperty,
  insertPropertyOption,
  insertRowValue,
  insertView,
  listBlocksInDrizzle,
  listPagesInDrizzle,
  listPropertiesInDrizzle,
  listPropertyOptionsInDrizzle,
  listRowValuesInDrizzle,
  listViewsInDrizzle,
  nextBlockPositionInDrizzle,
  nextPagePositionInDrizzle,
  nextPropertyOptionPositionInDrizzle,
  nextPropertyPositionInDrizzle,
  updateBlockInDrizzle,
  updatePageInDrizzle,
  updatePropertyInDrizzle,
  updatePropertyOptionInDrizzle,
  updateRowValueInDrizzle,
  updateViewInDrizzle,
} from "./queries-drizzle";
import {
  newId,
  now,
  requireTenantId,
  type Block,
  type CreateBlockInput,
  type CreatePageInput,
  type CreatePropertyInput,
  type CreatePropertyOptionInput,
  type CreateRowValueInput,
  type CreateViewInput,
  type ListBlocksOpts,
  type ListPagesOpts,
  type ListPropertiesOpts,
  type ListPropertyOptionsOpts,
  type ListRowValuesOpts,
  type ListViewsOpts,
  type Page,
  type Property,
  type PropertyOption,
  type RowValue,
  type SpaceRepository,
  type UpdateBlockInput,
  type UpdatePageInput,
  type UpdatePropertyInput,
  type UpdatePropertyOptionInput,
  type UpdateRowValueInput,
  type UpdateViewInput,
  type View,
} from "./queries-shared";

export { createMemorySpaceRepository } from "./queries-memory";

function short(value: unknown) {
  return assertText(value, MAX_SHORT_TEXT);
}

function assertBlockContent(content: unknown) {
  if (!content || typeof content !== "object") {
    return;
  }
  const text = (content as { text?: unknown }).text;
  if (text !== undefined) {
    assertText(text, MAX_BLOCK_TEXT);
  }
}

export type {
  Block,
  CreateBlockInput,
  CreatePageInput,
  CreatePropertyInput,
  CreatePropertyOptionInput,
  CreateRowValueInput,
  CreateViewInput,
  ListBlocksOpts,
  ListPagesOpts,
  ListPropertiesOpts,
  ListPropertyOptionsOpts,
  ListRowValuesOpts,
  ListViewsOpts,
  Page,
  Property,
  PropertyOption,
  RowValue,
  SpaceRepository,
  UpdateBlockInput,
  UpdatePageInput,
  UpdatePropertyInput,
  UpdatePropertyOptionInput,
  UpdateRowValueInput,
  UpdateViewInput,
  View,
} from "./queries-shared";

export async function listPages(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPagesOpts,
): Promise<Page[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listPagesInMemory(repo, scoped, opts)
    : listPagesInDrizzle(scoped, opts);
}

export async function getPage(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getPageInMemory(repo, scoped, id)
    : getPageInDrizzle(scoped, id);
}

/**
 * A batched write cannot look a default up: the rows it is about to replace are
 * still there (the wipe travels in the same batch) and there is no database
 * handle to ask, so a caller collecting statements has to bring its own value.
 * The guard is here, before the row is built, so no `max(...)` read is even
 * reachable while a batch is open.
 */
export async function createPage(
  tenantId: string,
  input: CreatePageInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<Page> {
  const scoped = requireTenantId(tenantId);
  if (opts?.batch && input.position === undefined) {
    throw new Error(
      "createPage needs an explicit `position` when its writes are collected into a batch",
    );
  }
  const parentId = input.parentId ?? null;
  const createdAt = now();
  const row: Page = {
    id: newId(),
    tenantId: scoped,
    parentId,
    type: input.type ?? "page",
    title: short(input.title) as string,
    icon: input.icon ?? null,
    position:
      input.position ??
      (repo
        ? nextPagePositionInMemory(repo, scoped, parentId)
        : await nextPagePositionInDrizzle(scoped, parentId)),
    createdAt,
    updatedAt: createdAt,
  };
  return repo ? createPageInMemory(repo, row) : insertPage(row, opts);
}

export async function updatePage(
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  if (input.title !== undefined) short(input.title);
  const updatedAt = now();
  return repo
    ? updatePageInMemory(repo, scoped, id, input, updatedAt)
    : updatePageInDrizzle(scoped, id, input, updatedAt);
}

export async function deletePage(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deletePageInMemory(repo, scoped, id)
    : deletePageInDrizzle(scoped, id);
}

export async function listBlocks(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listBlocksInMemory(repo, scoped, opts)
    : listBlocksInDrizzle(scoped, opts);
}

export async function getBlock(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getBlockInMemory(repo, scoped, id)
    : getBlockInDrizzle(scoped, id);
}

export async function createBlock(
  tenantId: string,
  input: CreateBlockInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<Block> {
  const scoped = requireTenantId(tenantId);
  if (opts?.batch && input.position === undefined) {
    throw new Error(
      "createBlock needs an explicit `position` when its writes are collected into a batch",
    );
  }
  assertBlockContent(input.content);
  const row: Block = {
    id: newId(),
    tenantId: scoped,
    pageId: input.pageId,
    type: input.type,
    content: input.content ?? {},
    position:
      input.position ??
      (repo
        ? nextBlockPositionInMemory(repo, scoped, input.pageId)
        : await nextBlockPositionInDrizzle(scoped, input.pageId)),
  };
  return repo ? createBlockInMemory(repo, row) : insertBlock(row, opts);
}

export async function updateBlock(
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  if (input.content !== undefined) assertBlockContent(input.content);
  return repo
    ? updateBlockInMemory(repo, scoped, id, input)
    : updateBlockInDrizzle(scoped, id, input);
}

export async function deleteBlock(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteBlockInMemory(repo, scoped, id)
    : deleteBlockInDrizzle(scoped, id);
}

export async function insertBlockAt(
  tenantId: string,
  pageId: string,
  index: number,
  input: Pick<CreateBlockInput, "type" | "content">,
  repo?: SpaceRepository,
): Promise<Block> {
  const scoped = requireTenantId(tenantId);
  const existing = await listBlocks(scoped, repo, { pageId });
  const insertAt = Math.max(0, Math.min(index, existing.length));
  for (const row of existing) {
    if (row.position >= insertAt) {
      await updateBlock(scoped, row.id, { position: row.position + 1 }, repo);
    }
  }
  return createBlock(
    scoped,
    {
      pageId,
      type: input.type,
      content: input.content,
      position: insertAt,
    },
    repo,
  );
}

export async function reorderBlocks(
  tenantId: string,
  pageId: string,
  orderedIds: string[],
  repo?: SpaceRepository,
): Promise<Block[] | null> {
  const scoped = requireTenantId(tenantId);
  const current = await listBlocks(scoped, repo, { pageId });
  const currentIds = [...current.map((row) => row.id)].sort();
  const nextIds = [...orderedIds].sort();
  if (
    currentIds.length !== nextIds.length ||
    currentIds.some((id, i) => id !== nextIds[i])
  ) {
    return null;
  }
  for (let position = 0; position < orderedIds.length; position += 1) {
    const id = orderedIds[position]!;
    await updateBlock(scoped, id, { position }, repo);
  }
  return listBlocks(scoped, repo, { pageId });
}

export async function listProperties(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listPropertiesInMemory(repo, scoped, opts)
    : listPropertiesInDrizzle(scoped, opts);
}

export async function getProperty(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getPropertyInMemory(repo, scoped, id)
    : getPropertyInDrizzle(scoped, id);
}

export async function createProperty(
  tenantId: string,
  input: CreatePropertyInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<Property> {
  const scoped = requireTenantId(tenantId);
  if (opts?.batch && input.position === undefined) {
    throw new Error(
      "createProperty needs an explicit `position` when its writes are collected into a batch",
    );
  }
  const row: Property = {
    id: newId(),
    tenantId: scoped,
    databaseId: input.databaseId,
    name: input.name,
    type: input.type,
    position:
      input.position ??
      (repo
        ? nextPropertyPositionInMemory(repo, scoped, input.databaseId)
        : await nextPropertyPositionInDrizzle(scoped, input.databaseId)),
  };
  return repo ? createPropertyInMemory(repo, row) : insertProperty(row, opts);
}

export async function updateProperty(
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updatePropertyInMemory(repo, scoped, id, input)
    : updatePropertyInDrizzle(scoped, id, input);
}

export async function deleteProperty(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deletePropertyInMemory(repo, scoped, id)
    : deletePropertyInDrizzle(scoped, id);
}

export async function listPropertyOptions(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listPropertyOptionsInMemory(repo, scoped, opts)
    : listPropertyOptionsInDrizzle(scoped, opts);
}

export async function getPropertyOption(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getPropertyOptionInMemory(repo, scoped, id)
    : getPropertyOptionInDrizzle(scoped, id);
}

export async function createPropertyOption(
  tenantId: string,
  input: CreatePropertyOptionInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<PropertyOption> {
  const scoped = requireTenantId(tenantId);
  if (opts?.batch && input.position === undefined) {
    throw new Error(
      "createPropertyOption needs an explicit `position` when its writes are collected into a batch",
    );
  }
  const row: PropertyOption = {
    id: newId(),
    tenantId: scoped,
    propertyId: input.propertyId,
    name: input.name,
    color: input.color,
    position:
      input.position ??
      (repo
        ? nextPropertyOptionPositionInMemory(repo, scoped, input.propertyId)
        : await nextPropertyOptionPositionInDrizzle(scoped, input.propertyId)),
  };
  return repo
    ? createPropertyOptionInMemory(repo, row)
    : insertPropertyOption(row, opts);
}

export async function updatePropertyOption(
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updatePropertyOptionInMemory(repo, scoped, id, input)
    : updatePropertyOptionInDrizzle(scoped, id, input);
}

export async function deletePropertyOption(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deletePropertyOptionInMemory(repo, scoped, id)
    : deletePropertyOptionInDrizzle(scoped, id);
}

export async function listRowValues(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listRowValuesInMemory(repo, scoped, opts)
    : listRowValuesInDrizzle(scoped, opts);
}

export async function getRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getRowValueInMemory(repo, scoped, rowId, propertyId)
    : getRowValueInDrizzle(scoped, rowId, propertyId);
}

export async function createRowValue(
  tenantId: string,
  input: CreateRowValueInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<RowValue> {
  const scoped = requireTenantId(tenantId);
  const row: RowValue = {
    tenantId: scoped,
    rowId: input.rowId,
    propertyId: input.propertyId,
    value: input.value ?? null,
  };
  return repo ? createRowValueInMemory(repo, row) : insertRowValue(row, opts);
}

export async function updateRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updateRowValueInMemory(repo, scoped, rowId, propertyId, input)
    : updateRowValueInDrizzle(scoped, rowId, propertyId, input);
}

export async function deleteRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteRowValueInMemory(repo, scoped, rowId, propertyId)
    : deleteRowValueInDrizzle(scoped, rowId, propertyId);
}

export async function listViews(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListViewsOpts,
): Promise<View[]> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? listViewsInMemory(repo, scoped, opts)
    : listViewsInDrizzle(scoped, opts);
}

export async function getView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? getViewInMemory(repo, scoped, databaseId, kind)
    : getViewInDrizzle(scoped, databaseId, kind);
}

export async function createView(
  tenantId: string,
  input: CreateViewInput,
  repo?: SpaceRepository,
  opts?: WriteOpts,
): Promise<View> {
  const scoped = requireTenantId(tenantId);
  const row: View = {
    tenantId: scoped,
    databaseId: input.databaseId,
    kind: input.kind,
    config: input.config ?? {},
  };
  return repo ? createViewInMemory(repo, row) : insertView(row, opts);
}

export async function updateView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? updateViewInMemory(repo, scoped, databaseId, kind, input)
    : updateViewInDrizzle(scoped, databaseId, kind, input);
}

export async function deleteView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return repo
    ? deleteViewInMemory(repo, scoped, databaseId, kind)
    : deleteViewInDrizzle(scoped, databaseId, kind);
}
