import type { ViewKind } from "./constants";
import {
  clone,
  compareByPositionThenId,
  removeWhere,
  sameParent,
  type Block,
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

export function createMemorySpaceRepository(): SpaceRepository {
  return {
    pages: [],
    blocks: [],
    properties: [],
    propertyOptions: [],
    rowValues: [],
    views: [],
  };
}

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

export function nextPagePositionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  parentId: string | null,
): number {
  const orders = repo.pages
    .filter(
      (row) => row.tenantId === tenantId && sameParent(row.parentId, parentId),
    )
    .map((row) => row.position);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export function nextPositionInMemory(
  tenantId: string,
  rows: { tenantId: string; position: number }[],
  match: (row: { tenantId: string; position: number }) => boolean,
): number {
  const orders = rows
    .filter((row) => row.tenantId === tenantId && match(row))
    .map((row) => row.position);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export function nextBlockPositionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  pageId: string,
): number {
  return nextPositionInMemory(
    tenantId,
    repo.blocks,
    (candidate) =>
      "pageId" in candidate && (candidate as Block).pageId === pageId,
  );
}

export function nextPropertyPositionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  databaseId: string,
): number {
  return nextPositionInMemory(
    tenantId,
    repo.properties,
    (candidate) =>
      "databaseId" in candidate &&
      (candidate as Property).databaseId === databaseId,
  );
}

export function nextPropertyOptionPositionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  propertyId: string,
): number {
  return nextPositionInMemory(
    tenantId,
    repo.propertyOptions,
    (candidate) =>
      "propertyId" in candidate &&
      (candidate as PropertyOption).propertyId === propertyId,
  );
}

function descendantPageIds(
  repo: SpaceRepository,
  tenantId: string,
  rootId: string,
): string[] {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const page of repo.pages) {
      if (page.tenantId === tenantId && page.parentId === current) {
        ids.push(page.id);
        queue.push(page.id);
      }
    }
  }
  return ids;
}

export async function listPagesInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListPagesOpts,
): Promise<Page[]> {
  return repo.pages
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.parentId === undefined ||
          sameParent(row.parentId, opts.parentId)),
    )
    .map(clone)
    .sort(compareByPositionThenId);
}

export async function getPageInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const row = findScoped(repo.pages, tenantId, id);
  return row ? clone(row) : null;
}

export async function createPageInMemory(
  repo: SpaceRepository,
  row: Page,
): Promise<Page> {
  repo.pages.push(row);
  return clone(row);
}

export async function updatePageInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  updatedAt: Date,
): Promise<Page | null> {
  const row = findScoped(repo.pages, tenantId, id);
  if (!row) {
    return null;
  }
  if (input.title !== undefined) row.title = input.title;
  if (input.type !== undefined) row.type = input.type;
  if (input.parentId !== undefined) row.parentId = input.parentId;
  if (input.icon !== undefined) row.icon = input.icon;
  if (input.position !== undefined) row.position = input.position;
  row.updatedAt = updatedAt;
  return clone(row);
}

export async function deletePageInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const existing = findScoped(repo.pages, tenantId, id);
  if (!existing) {
    return null;
  }
  const pageIds = new Set(descendantPageIds(repo, tenantId, id));
  const propertyIds = new Set(
    repo.properties
      .filter((row) => row.tenantId === tenantId && pageIds.has(row.databaseId))
      .map((row) => row.id),
  );
  removeWhere(
    repo.views,
    (row) => row.tenantId === tenantId && pageIds.has(row.databaseId),
  );
  removeWhere(
    repo.rowValues,
    (row) =>
      row.tenantId === tenantId &&
      (pageIds.has(row.rowId) || propertyIds.has(row.propertyId)),
  );
  removeWhere(
    repo.propertyOptions,
    (row) => row.tenantId === tenantId && propertyIds.has(row.propertyId),
  );
  removeWhere(
    repo.properties,
    (row) => row.tenantId === tenantId && pageIds.has(row.databaseId),
  );
  removeWhere(
    repo.blocks,
    (row) => row.tenantId === tenantId && pageIds.has(row.pageId),
  );
  removeWhere(
    repo.pages,
    (row) => row.tenantId === tenantId && pageIds.has(row.id),
  );
  return clone(existing);
}

export async function listBlocksInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  return repo.blocks
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.pageId === undefined || row.pageId === opts.pageId),
    )
    .map(clone)
    .sort(compareByPositionThenId);
}

export async function getBlockInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const row = findScoped(repo.blocks, tenantId, id);
  return row ? clone(row) : null;
}

export async function createBlockInMemory(
  repo: SpaceRepository,
  row: Block,
): Promise<Block> {
  repo.blocks.push(row);
  return clone(row);
}

export async function updateBlockInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
): Promise<Block | null> {
  const row = findScoped(repo.blocks, tenantId, id);
  if (!row) {
    return null;
  }
  if (input.pageId !== undefined) row.pageId = input.pageId;
  if (input.type !== undefined) row.type = input.type;
  if (input.content !== undefined) row.content = input.content;
  if (input.position !== undefined) row.position = input.position;
  return clone(row);
}

export async function deleteBlockInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const index = repo.blocks.findIndex(
    (row) => row.tenantId === tenantId && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.blocks.splice(index, 1);
  return clone(removed);
}

export async function listPropertiesInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  return repo.properties
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.databaseId === undefined || row.databaseId === opts.databaseId),
    )
    .map(clone)
    .sort(compareByPositionThenId);
}

export async function getPropertyInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const row = findScoped(repo.properties, tenantId, id);
  return row ? clone(row) : null;
}

export async function createPropertyInMemory(
  repo: SpaceRepository,
  row: Property,
): Promise<Property> {
  repo.properties.push(row);
  return clone(row);
}

export async function updatePropertyInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
): Promise<Property | null> {
  const row = findScoped(repo.properties, tenantId, id);
  if (!row) {
    return null;
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.position !== undefined) row.position = input.position;
  return clone(row);
}

export async function deletePropertyInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const index = repo.properties.findIndex(
    (row) => row.tenantId === tenantId && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.properties.splice(index, 1);
  removeWhere(
    repo.propertyOptions,
    (row) => row.tenantId === tenantId && row.propertyId === id,
  );
  removeWhere(
    repo.rowValues,
    (row) => row.tenantId === tenantId && row.propertyId === id,
  );
  return clone(removed);
}

export async function listPropertyOptionsInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  return repo.propertyOptions
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.propertyId === undefined || row.propertyId === opts.propertyId),
    )
    .map(clone)
    .sort(compareByPositionThenId);
}

export async function getPropertyOptionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const row = findScoped(repo.propertyOptions, tenantId, id);
  return row ? clone(row) : null;
}

export async function createPropertyOptionInMemory(
  repo: SpaceRepository,
  row: PropertyOption,
): Promise<PropertyOption> {
  repo.propertyOptions.push(row);
  return clone(row);
}

export async function updatePropertyOptionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
): Promise<PropertyOption | null> {
  const row = findScoped(repo.propertyOptions, tenantId, id);
  if (!row) {
    return null;
  }
  if (input.name !== undefined) row.name = input.name;
  if (input.color !== undefined) row.color = input.color;
  if (input.position !== undefined) row.position = input.position;
  return clone(row);
}

export async function deletePropertyOptionInMemory(
  repo: SpaceRepository,
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const index = repo.propertyOptions.findIndex(
    (row) => row.tenantId === tenantId && row.id === id,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.propertyOptions.splice(index, 1);
  return clone(removed);
}

export async function listRowValuesInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  return repo.rowValues
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.rowId === undefined || row.rowId === opts.rowId) &&
        (opts?.propertyId === undefined || row.propertyId === opts.propertyId),
    )
    .map(clone);
}

export async function getRowValueInMemory(
  repo: SpaceRepository,
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const row = repo.rowValues.find(
    (candidate) =>
      candidate.tenantId === tenantId &&
      candidate.rowId === rowId &&
      candidate.propertyId === propertyId,
  );
  return row ? clone(row) : null;
}

export async function createRowValueInMemory(
  repo: SpaceRepository,
  row: RowValue,
): Promise<RowValue> {
  repo.rowValues.push(row);
  return clone(row);
}

export async function updateRowValueInMemory(
  repo: SpaceRepository,
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
): Promise<RowValue | null> {
  const row = repo.rowValues.find(
    (candidate) =>
      candidate.tenantId === tenantId &&
      candidate.rowId === rowId &&
      candidate.propertyId === propertyId,
  );
  if (!row) {
    return null;
  }
  if (input.value !== undefined) row.value = input.value;
  return clone(row);
}

export async function deleteRowValueInMemory(
  repo: SpaceRepository,
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const index = repo.rowValues.findIndex(
    (row) =>
      row.tenantId === tenantId &&
      row.rowId === rowId &&
      row.propertyId === propertyId,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.rowValues.splice(index, 1);
  return clone(removed);
}

export async function listViewsInMemory(
  repo: SpaceRepository,
  tenantId: string,
  opts?: ListViewsOpts,
): Promise<View[]> {
  return repo.views
    .filter(
      (row) =>
        row.tenantId === tenantId &&
        (opts?.databaseId === undefined || row.databaseId === opts.databaseId),
    )
    .map(clone);
}

export async function getViewInMemory(
  repo: SpaceRepository,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const row = repo.views.find(
    (candidate) =>
      candidate.tenantId === tenantId &&
      candidate.databaseId === databaseId &&
      candidate.kind === kind,
  );
  return row ? clone(row) : null;
}

export async function createViewInMemory(
  repo: SpaceRepository,
  row: View,
): Promise<View> {
  repo.views.push(row);
  return clone(row);
}

export async function updateViewInMemory(
  repo: SpaceRepository,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
): Promise<View | null> {
  const row = repo.views.find(
    (candidate) =>
      candidate.tenantId === tenantId &&
      candidate.databaseId === databaseId &&
      candidate.kind === kind,
  );
  if (!row) {
    return null;
  }
  if (input.config !== undefined) row.config = input.config;
  return clone(row);
}

export async function deleteViewInMemory(
  repo: SpaceRepository,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const index = repo.views.findIndex(
    (row) =>
      row.tenantId === tenantId &&
      row.databaseId === databaseId &&
      row.kind === kind,
  );
  if (index === -1) {
    return null;
  }
  const [removed] = repo.views.splice(index, 1);
  return clone(removed);
}
