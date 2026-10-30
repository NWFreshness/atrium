import { assertOneOf, InputError } from "../input/result";
import { assertText, MAX_BLOCK_TEXT, MAX_SHORT_TEXT } from "../input/text";
import {
  BLOCK_TYPES,
  PAGE_TYPES,
  PROPERTY_TYPES,
  VIEW_KINDS,
  type ViewKind,
} from "./constants";
import { getDb } from "../db";
import { createDrizzleSpaceStore, type SpaceStore } from "./store";
import {
  newId,
  now,
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
  type UpdateBlockInput,
  type UpdatePageInput,
  type UpdatePropertyInput,
  type UpdatePropertyOptionInput,
  type UpdateRowValueInput,
  type UpdateViewInput,
  type View,
} from "./queries-shared";
import { requireTenantId } from "../tenancy";

export { createMemorySpaceRepository } from "./queries-memory";
export { createMemorySpaceStore, type SpaceStore } from "./store";

/** Production storage. Resolved per call so a test that injects a store never opens a database. */
function defaultStore(): SpaceStore {
  if (!process.env.DATABASE_URL) {
    throw new Error("Space store required");
  }
  return createDrizzleSpaceStore(getDb());
}

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
  store: SpaceStore = defaultStore(),
  opts?: ListPagesOpts,
): Promise<Page[]> {
  const scoped = requireTenantId(tenantId);
  return store.pages.list(scoped, opts);
}

export async function getPage(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  return store.pages.get(scoped, id);
}

/** The tenant's own page, or a rejection: another tenant's id reads as missing. */
export async function requirePage(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
  field = "pageId",
): Promise<Page> {
  const page = await getPage(tenantId, id, store);
  if (!page) {
    throw new InputError(field, "Page not found");
  }
  return page;
}

export async function requireDatabase(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Page> {
  const page = await getPage(tenantId, id, store);
  if (!page || page.type !== "database") {
    throw new InputError("databaseId", "Page not found");
  }
  return page;
}

export async function createPage(
  tenantId: string,
  input: CreatePageInput,
  store: SpaceStore = defaultStore(),
): Promise<Page> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(PAGE_TYPES, input.type ?? "page", "type");
  if (input.parentId) {
    await requirePage(scoped, input.parentId, store, "parentId");
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
      input.position ?? (await store.pages.nextPosition(scoped, parentId)),
    createdAt,
    updatedAt: createdAt,
  };
  // A page is never born empty: the editor needs a block to type into, and
  // creating it here keeps the page render free of writes.
  const opening =
    input.blocks ??
    (row.type === "database"
      ? []
      : [{ type: "paragraph" as const, content: { text: "" } }]);
  return store.pages.insert(
    row,
    opening.map((block, position) => blockRow(scoped, row.id, block, position)),
  );
}

export async function updatePage(
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  store: SpaceStore = defaultStore(),
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  if (input.title !== undefined) short(input.title);
  const updatedAt = now();
  return store.pages.update(scoped, id, input, updatedAt);
}

export async function deletePage(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  return store.pages.delete(scoped, id);
}

export async function listBlocks(
  tenantId: string,
  store: SpaceStore = defaultStore(),
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  const scoped = requireTenantId(tenantId);
  return store.blocks.list(scoped, opts);
}

export async function getBlock(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  return store.blocks.get(scoped, id);
}

/** Validates one block and builds its row. Pure: no reads, no writes. */
function blockRow(
  tenantId: string,
  pageId: string,
  input: Pick<CreateBlockInput, "type" | "content">,
  position: number,
): Block {
  assertOneOf(BLOCK_TYPES, input.type, "type");
  assertBlockContent(input.content);
  return {
    id: newId(),
    tenantId,
    pageId,
    type: input.type,
    content: input.content ?? {},
    position,
  };
}

/** A validated block for an existing page; the caller decides how it is written. */
async function newBlock(
  tenantId: string,
  input: CreateBlockInput,
  store: SpaceStore = defaultStore(),
): Promise<Block> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(BLOCK_TYPES, input.type, "type");
  await requirePage(scoped, input.pageId, store);
  return blockRow(
    scoped,
    input.pageId,
    input,
    input.position ?? (await store.blocks.nextPosition(scoped, input.pageId)),
  );
}

export async function createBlock(
  tenantId: string,
  input: CreateBlockInput,
  store: SpaceStore = defaultStore(),
): Promise<Block> {
  const row = await newBlock(tenantId, input, store);
  return store.blocks.insert(row);
}

export async function updateBlock(
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
  store: SpaceStore = defaultStore(),
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  if (input.type !== undefined) {
    assertOneOf(BLOCK_TYPES, input.type, "type");
  }
  if (input.content !== undefined) assertBlockContent(input.content);
  return store.blocks.update(scoped, id, input);
}

export async function deleteBlock(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  return store.blocks.delete(scoped, id);
}

export async function insertBlockAt(
  tenantId: string,
  pageId: string,
  index: number,
  input: Pick<CreateBlockInput, "type" | "content">,
  store: SpaceStore = defaultStore(),
): Promise<Block> {
  const scoped = requireTenantId(tenantId);
  const existing = await listBlocks(scoped, store, { pageId });
  const insertAt = Math.max(0, Math.min(index, existing.length));
  const row = await newBlock(
    scoped,
    { pageId, type: input.type, content: input.content, position: insertAt },
    store,
  );
  // The shift and the insert go down together, so a failure cannot leave a gap.
  await store.blocks.reorder(
    scoped,
    existing
      .filter((block) => block.position >= insertAt)
      .map((block) => ({ id: block.id, position: block.position + 1 })),
    row,
  );
  return row;
}

/** True when `orderedIds` is exactly the current rows, in some order. */
function sameIds(current: { id: string }[], orderedIds: string[]): boolean {
  const currentIds = current.map((row) => row.id).sort();
  const nextIds = [...orderedIds].sort();
  return (
    currentIds.length === nextIds.length &&
    currentIds.every((id, i) => id === nextIds[i])
  );
}

export async function reorderBlocks(
  tenantId: string,
  pageId: string,
  orderedIds: string[],
  store: SpaceStore = defaultStore(),
): Promise<Block[] | null> {
  const scoped = requireTenantId(tenantId);
  const current = await listBlocks(scoped, store, { pageId });
  if (!sameIds(current, orderedIds)) {
    return null;
  }
  await store.blocks.reorder(
    scoped,
    orderedIds.map((id, position) => ({ id, position })),
  );
  return listBlocks(scoped, store, { pageId });
}

/** Reorders the row pages of one database; anything but its exact rows is refused. */
export async function reorderRows(
  tenantId: string,
  databaseId: string,
  orderedIds: string[],
  store: SpaceStore = defaultStore(),
): Promise<Page[] | null> {
  const scoped = requireTenantId(tenantId);
  const rows = async () =>
    (await listPages(scoped, store, { parentId: databaseId })).filter(
      (page) => page.type === "row",
    );
  if (!sameIds(await rows(), orderedIds)) {
    return null;
  }
  await store.pages.reorder(
    scoped,
    orderedIds.map((id, position) => ({ id, position })),
    now(),
  );
  return rows();
}

export async function listProperties(
  tenantId: string,
  store: SpaceStore = defaultStore(),
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  const scoped = requireTenantId(tenantId);
  return store.properties.list(scoped, opts);
}

export async function getProperty(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return store.properties.get(scoped, id);
}

export async function createProperty(
  tenantId: string,
  input: CreatePropertyInput,
  store: SpaceStore = defaultStore(),
): Promise<Property> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(PROPERTY_TYPES, input.type, "type");
  await requireDatabase(scoped, input.databaseId, store);
  const row: Property = {
    id: newId(),
    tenantId: scoped,
    databaseId: input.databaseId,
    name: input.name,
    type: input.type,
    position:
      input.position ??
      (await store.properties.nextPosition(scoped, input.databaseId)),
  };
  return store.properties.insert(row);
}

export async function updateProperty(
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
  store: SpaceStore = defaultStore(),
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return store.properties.update(scoped, id, input);
}

export async function deleteProperty(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  return store.properties.delete(scoped, id);
}

export async function listPropertyOptions(
  tenantId: string,
  store: SpaceStore = defaultStore(),
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  const scoped = requireTenantId(tenantId);
  return store.propertyOptions.list(scoped, opts);
}

export async function getPropertyOption(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return store.propertyOptions.get(scoped, id);
}

export async function createPropertyOption(
  tenantId: string,
  input: CreatePropertyOptionInput,
  store: SpaceStore = defaultStore(),
): Promise<PropertyOption> {
  const scoped = requireTenantId(tenantId);
  if (!(await getProperty(scoped, input.propertyId, store))) {
    throw new InputError("propertyId", "Page not found");
  }
  const row: PropertyOption = {
    id: newId(),
    tenantId: scoped,
    propertyId: input.propertyId,
    name: input.name,
    color: input.color,
    position:
      input.position ??
      (await store.propertyOptions.nextPosition(scoped, input.propertyId)),
  };
  return store.propertyOptions.insert(row);
}

export async function updatePropertyOption(
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
  store: SpaceStore = defaultStore(),
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return store.propertyOptions.update(scoped, id, input);
}

export async function deletePropertyOption(
  tenantId: string,
  id: string,
  store: SpaceStore = defaultStore(),
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  return store.propertyOptions.delete(scoped, id);
}

export async function listRowValues(
  tenantId: string,
  store: SpaceStore = defaultStore(),
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  const scoped = requireTenantId(tenantId);
  return store.rowValues.list(scoped, opts);
}

export async function getRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  store: SpaceStore = defaultStore(),
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return store.rowValues.get(scoped, rowId, propertyId);
}

export async function createRowValue(
  tenantId: string,
  input: CreateRowValueInput,
  store: SpaceStore = defaultStore(),
): Promise<RowValue> {
  const scoped = requireTenantId(tenantId);
  const row: RowValue = {
    tenantId: scoped,
    rowId: input.rowId,
    propertyId: input.propertyId,
    value: input.value ?? null,
  };
  return store.rowValues.insert(row);
}

export async function updateRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
  store: SpaceStore = defaultStore(),
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return store.rowValues.update(scoped, rowId, propertyId, input);
}

export async function deleteRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  store: SpaceStore = defaultStore(),
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  return store.rowValues.delete(scoped, rowId, propertyId);
}

export async function listViews(
  tenantId: string,
  store: SpaceStore = defaultStore(),
  opts?: ListViewsOpts,
): Promise<View[]> {
  const scoped = requireTenantId(tenantId);
  return store.views.list(scoped, opts);
}

export async function getView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  store: SpaceStore = defaultStore(),
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return store.views.get(scoped, databaseId, kind);
}

export async function createView(
  tenantId: string,
  input: CreateViewInput,
  store: SpaceStore = defaultStore(),
): Promise<View> {
  const scoped = requireTenantId(tenantId);
  assertOneOf(VIEW_KINDS, input.kind, "kind");
  await requireDatabase(scoped, input.databaseId, store);
  const row: View = {
    tenantId: scoped,
    databaseId: input.databaseId,
    kind: input.kind,
    config: input.config ?? {},
  };
  return store.views.insert(row);
}

export async function updateView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
  store: SpaceStore = defaultStore(),
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return store.views.update(scoped, databaseId, kind, input);
}

export async function deleteView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  store: SpaceStore = defaultStore(),
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  return store.views.delete(scoped, databaseId, kind);
}
