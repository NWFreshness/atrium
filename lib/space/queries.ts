import { and, eq, isNull, max, type InferSelectModel } from "drizzle-orm";
import { getDb } from "../db";
import type { BlockType, PageType, PropertyType, ViewKind } from "./constants";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";

export type Page = InferSelectModel<typeof pages>;
export type Block = InferSelectModel<typeof blocks>;
export type Property = InferSelectModel<typeof properties>;
export type PropertyOption = InferSelectModel<typeof propertyOptions>;
export type RowValue = InferSelectModel<typeof rowValues>;
export type View = InferSelectModel<typeof views>;

export type SpaceRepository = {
  pages: Page[];
  blocks: Block[];
  properties: Property[];
  propertyOptions: PropertyOption[];
  rowValues: RowValue[];
  views: View[];
};

export type CreatePageInput = {
  title: string;
  type?: PageType;
  parentId?: string | null;
  icon?: string | null;
  position?: number;
};

export type UpdatePageInput = Partial<CreatePageInput>;

export type ListPagesOpts = {
  parentId?: string | null;
};

export type CreateBlockInput = {
  pageId: string;
  type: BlockType;
  content?: Record<string, unknown>;
  position?: number;
};

export type UpdateBlockInput = Partial<
  Omit<CreateBlockInput, "pageId"> & { pageId?: string }
>;

export type ListBlocksOpts = {
  pageId?: string;
};

export type CreatePropertyInput = {
  databaseId: string;
  name: string;
  type: PropertyType;
  position?: number;
};

export type UpdatePropertyInput = Partial<
  Omit<CreatePropertyInput, "databaseId" | "type">
>;

export type ListPropertiesOpts = {
  databaseId?: string;
};

export type CreatePropertyOptionInput = {
  propertyId: string;
  name: string;
  color: string;
  position?: number;
};

export type UpdatePropertyOptionInput = Partial<
  Omit<CreatePropertyOptionInput, "propertyId">
>;

export type ListPropertyOptionsOpts = {
  propertyId?: string;
};

export type CreateRowValueInput = {
  rowId: string;
  propertyId: string;
  value?: unknown;
};

export type UpdateRowValueInput = {
  value?: unknown;
};

export type ListRowValuesOpts = {
  rowId?: string;
  propertyId?: string;
};

export type CreateViewInput = {
  databaseId: string;
  kind: ViewKind;
  config?: Record<string, unknown>;
};

export type UpdateViewInput = {
  config?: Record<string, unknown>;
};

export type ListViewsOpts = {
  databaseId?: string;
};

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

function requireTenantId(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId;
}

function requireSpaceDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Space store required");
  }
  return getDb();
}

function newId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
}

function clone<T>(row: T): T {
  return structuredClone(row);
}

function findScoped<T extends { id: string; tenantId: string }>(
  rows: T[],
  tenantId: string,
  id: string,
): T | undefined {
  return rows.find((row) => row.tenantId === tenantId && row.id === id);
}

function tenantRow(
  table:
    typeof pages | typeof blocks | typeof properties | typeof propertyOptions,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

function sameParent(
  pageParentId: string | null,
  parentId: string | null,
): boolean {
  return pageParentId === parentId;
}

function compareByPositionThenId(
  a: { position: number; id: string },
  b: { position: number; id: string },
): number {
  if (a.position !== b.position) {
    return a.position - b.position;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

async function nextPagePosition(
  tenantId: string,
  parentId: string | null,
  repo?: SpaceRepository,
): Promise<number> {
  if (repo) {
    const orders = repo.pages
      .filter(
        (row) =>
          row.tenantId === tenantId && sameParent(row.parentId, parentId),
      )
      .map((row) => row.position);
    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  }
  const parentFilter =
    parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId);
  const [agg] = await requireSpaceDb()
    .select({ maxOrder: max(pages.position) })
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), parentFilter));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

async function nextPosition(
  tenantId: string,
  rows: { tenantId: string; position: number }[],
  match: (row: { tenantId: string; position: number }) => boolean,
  sqlMax: () => Promise<number | null>,
  repo?: SpaceRepository,
): Promise<number> {
  if (repo) {
    const orders = rows
      .filter((row) => row.tenantId === tenantId && match(row))
      .map((row) => row.position);
    return orders.length === 0 ? 0 : Math.max(...orders) + 1;
  }
  const maxOrder = await sqlMax();
  return maxOrder == null ? 0 : maxOrder + 1;
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

function removeWhere<T>(rows: T[], predicate: (row: T) => boolean): void {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (predicate(rows[i]!)) {
      rows.splice(i, 1);
    }
  }
}

export async function listPages(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPagesOpts,
): Promise<Page[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.pages
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.parentId === undefined ||
            sameParent(row.parentId, opts.parentId)),
      )
      .map(clone)
      .sort(compareByPositionThenId);
  }
  const filters = [
    eq(pages.tenantId, scoped),
    ...(opts?.parentId === undefined
      ? []
      : [
          opts.parentId === null
            ? isNull(pages.parentId)
            : eq(pages.parentId, opts.parentId),
        ]),
  ];
  return requireSpaceDb()
    .select()
    .from(pages)
    .where(and(...filters))
    .orderBy(pages.position, pages.id);
}

export async function getPage(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.pages, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(pages)
    .where(tenantRow(pages, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createPage(
  tenantId: string,
  input: CreatePageInput,
  repo?: SpaceRepository,
): Promise<Page> {
  const scoped = requireTenantId(tenantId);
  const parentId = input.parentId ?? null;
  const createdAt = now();
  const row: Page = {
    id: newId(),
    tenantId: scoped,
    parentId,
    type: input.type ?? "page",
    title: input.title,
    icon: input.icon ?? null,
    position:
      input.position ?? (await nextPagePosition(scoped, parentId, repo)),
    createdAt,
    updatedAt: createdAt,
  };
  if (repo) {
    repo.pages.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(pages)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePage(
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  const updatedAt = now();
  if (repo) {
    const row = findScoped(repo.pages, scoped, id);
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
  const [row] = await requireSpaceDb()
    .update(pages)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      updatedAt,
    })
    .where(tenantRow(pages, scoped, id))
    .returning();
  return row ?? null;
}

export async function deletePage(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Page | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const existing = findScoped(repo.pages, scoped, id);
    if (!existing) {
      return null;
    }
    const pageIds = new Set(descendantPageIds(repo, scoped, id));
    const propertyIds = new Set(
      repo.properties
        .filter((row) => row.tenantId === scoped && pageIds.has(row.databaseId))
        .map((row) => row.id),
    );
    removeWhere(
      repo.views,
      (row) => row.tenantId === scoped && pageIds.has(row.databaseId),
    );
    removeWhere(
      repo.rowValues,
      (row) =>
        row.tenantId === scoped &&
        (pageIds.has(row.rowId) || propertyIds.has(row.propertyId)),
    );
    removeWhere(
      repo.propertyOptions,
      (row) => row.tenantId === scoped && propertyIds.has(row.propertyId),
    );
    removeWhere(
      repo.properties,
      (row) => row.tenantId === scoped && pageIds.has(row.databaseId),
    );
    removeWhere(
      repo.blocks,
      (row) => row.tenantId === scoped && pageIds.has(row.pageId),
    );
    removeWhere(
      repo.pages,
      (row) => row.tenantId === scoped && pageIds.has(row.id),
    );
    return clone(existing);
  }
  const [removed] = await requireSpaceDb()
    .delete(pages)
    .where(tenantRow(pages, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listBlocks(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.blocks
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.pageId === undefined || row.pageId === opts.pageId),
      )
      .map(clone)
      .sort(compareByPositionThenId);
  }
  const filters = [
    eq(blocks.tenantId, scoped),
    ...(opts?.pageId !== undefined ? [eq(blocks.pageId, opts.pageId)] : []),
  ];
  return requireSpaceDb()
    .select()
    .from(blocks)
    .where(and(...filters))
    .orderBy(blocks.position, blocks.id);
}

export async function getBlock(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.blocks, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(blocks)
    .where(tenantRow(blocks, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createBlock(
  tenantId: string,
  input: CreateBlockInput,
  repo?: SpaceRepository,
): Promise<Block> {
  const scoped = requireTenantId(tenantId);
  const row: Block = {
    id: newId(),
    tenantId: scoped,
    pageId: input.pageId,
    type: input.type,
    content: input.content ?? {},
    position:
      input.position ??
      (await nextPosition(
        scoped,
        repo?.blocks ?? [],
        (candidate) =>
          "pageId" in candidate && (candidate as Block).pageId === input.pageId,
        async () => {
          const [agg] = await requireSpaceDb()
            .select({ maxOrder: max(blocks.position) })
            .from(blocks)
            .where(
              and(eq(blocks.tenantId, scoped), eq(blocks.pageId, input.pageId)),
            );
          return agg?.maxOrder ?? null;
        },
        repo,
      )),
  };
  if (repo) {
    repo.blocks.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(blocks)
    .values(row)
    .returning();
  return inserted;
}

export async function updateBlock(
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.blocks, scoped, id);
    if (!row) {
      return null;
    }
    if (input.pageId !== undefined) row.pageId = input.pageId;
    if (input.type !== undefined) row.type = input.type;
    if (input.content !== undefined) row.content = input.content;
    if (input.position !== undefined) row.position = input.position;
    return clone(row);
  }
  const [row] = await requireSpaceDb()
    .update(blocks)
    .set({
      ...(input.pageId !== undefined ? { pageId: input.pageId } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(blocks, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteBlock(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Block | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.blocks.findIndex(
      (row) => row.tenantId === scoped && row.id === id,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.blocks.splice(index, 1);
    return clone(removed);
  }
  const [removed] = await requireSpaceDb()
    .delete(blocks)
    .where(tenantRow(blocks, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listProperties(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.properties
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.databaseId === undefined ||
            row.databaseId === opts.databaseId),
      )
      .map(clone)
      .sort(compareByPositionThenId);
  }
  const filters = [
    eq(properties.tenantId, scoped),
    ...(opts?.databaseId !== undefined
      ? [eq(properties.databaseId, opts.databaseId)]
      : []),
  ];
  return requireSpaceDb()
    .select()
    .from(properties)
    .where(and(...filters))
    .orderBy(properties.position, properties.id);
}

export async function getProperty(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.properties, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(properties)
    .where(tenantRow(properties, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createProperty(
  tenantId: string,
  input: CreatePropertyInput,
  repo?: SpaceRepository,
): Promise<Property> {
  const scoped = requireTenantId(tenantId);
  const row: Property = {
    id: newId(),
    tenantId: scoped,
    databaseId: input.databaseId,
    name: input.name,
    type: input.type,
    position:
      input.position ??
      (await nextPosition(
        scoped,
        repo?.properties ?? [],
        (candidate) =>
          "databaseId" in candidate &&
          (candidate as Property).databaseId === input.databaseId,
        async () => {
          const [agg] = await requireSpaceDb()
            .select({ maxOrder: max(properties.position) })
            .from(properties)
            .where(
              and(
                eq(properties.tenantId, scoped),
                eq(properties.databaseId, input.databaseId),
              ),
            );
          return agg?.maxOrder ?? null;
        },
        repo,
      )),
  };
  if (repo) {
    repo.properties.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(properties)
    .values(row)
    .returning();
  return inserted;
}

export async function updateProperty(
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.properties, scoped, id);
    if (!row) {
      return null;
    }
    if (input.name !== undefined) row.name = input.name;
    if (input.position !== undefined) row.position = input.position;
    return clone(row);
  }
  const [row] = await requireSpaceDb()
    .update(properties)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(properties, scoped, id))
    .returning();
  return row ?? null;
}

export async function deleteProperty(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<Property | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.properties.findIndex(
      (row) => row.tenantId === scoped && row.id === id,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.properties.splice(index, 1);
    removeWhere(
      repo.propertyOptions,
      (row) => row.tenantId === scoped && row.propertyId === id,
    );
    removeWhere(
      repo.rowValues,
      (row) => row.tenantId === scoped && row.propertyId === id,
    );
    return clone(removed);
  }
  const [removed] = await requireSpaceDb()
    .delete(properties)
    .where(tenantRow(properties, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listPropertyOptions(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.propertyOptions
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.propertyId === undefined ||
            row.propertyId === opts.propertyId),
      )
      .map(clone)
      .sort(compareByPositionThenId);
  }
  const filters = [
    eq(propertyOptions.tenantId, scoped),
    ...(opts?.propertyId !== undefined
      ? [eq(propertyOptions.propertyId, opts.propertyId)]
      : []),
  ];
  return requireSpaceDb()
    .select()
    .from(propertyOptions)
    .where(and(...filters))
    .orderBy(propertyOptions.position, propertyOptions.id);
}

export async function getPropertyOption(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.propertyOptions, scoped, id);
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(propertyOptions)
    .where(tenantRow(propertyOptions, scoped, id))
    .limit(1);
  return row ?? null;
}

export async function createPropertyOption(
  tenantId: string,
  input: CreatePropertyOptionInput,
  repo?: SpaceRepository,
): Promise<PropertyOption> {
  const scoped = requireTenantId(tenantId);
  const row: PropertyOption = {
    id: newId(),
    tenantId: scoped,
    propertyId: input.propertyId,
    name: input.name,
    color: input.color,
    position:
      input.position ??
      (await nextPosition(
        scoped,
        repo?.propertyOptions ?? [],
        (candidate) =>
          "propertyId" in candidate &&
          (candidate as PropertyOption).propertyId === input.propertyId,
        async () => {
          const [agg] = await requireSpaceDb()
            .select({ maxOrder: max(propertyOptions.position) })
            .from(propertyOptions)
            .where(
              and(
                eq(propertyOptions.tenantId, scoped),
                eq(propertyOptions.propertyId, input.propertyId),
              ),
            );
          return agg?.maxOrder ?? null;
        },
        repo,
      )),
  };
  if (repo) {
    repo.propertyOptions.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(propertyOptions)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePropertyOption(
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = findScoped(repo.propertyOptions, scoped, id);
    if (!row) {
      return null;
    }
    if (input.name !== undefined) row.name = input.name;
    if (input.color !== undefined) row.color = input.color;
    if (input.position !== undefined) row.position = input.position;
    return clone(row);
  }
  const [row] = await requireSpaceDb()
    .update(propertyOptions)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(propertyOptions, scoped, id))
    .returning();
  return row ?? null;
}

export async function deletePropertyOption(
  tenantId: string,
  id: string,
  repo?: SpaceRepository,
): Promise<PropertyOption | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.propertyOptions.findIndex(
      (row) => row.tenantId === scoped && row.id === id,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.propertyOptions.splice(index, 1);
    return clone(removed);
  }
  const [removed] = await requireSpaceDb()
    .delete(propertyOptions)
    .where(tenantRow(propertyOptions, scoped, id))
    .returning();
  return removed ?? null;
}

export async function listRowValues(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.rowValues
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.rowId === undefined || row.rowId === opts.rowId) &&
          (opts?.propertyId === undefined ||
            row.propertyId === opts.propertyId),
      )
      .map(clone);
  }
  const filters = [
    eq(rowValues.tenantId, scoped),
    ...(opts?.rowId !== undefined ? [eq(rowValues.rowId, opts.rowId)] : []),
    ...(opts?.propertyId !== undefined
      ? [eq(rowValues.propertyId, opts.propertyId)]
      : []),
  ];
  return requireSpaceDb()
    .select()
    .from(rowValues)
    .where(and(...filters));
}

export async function getRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = repo.rowValues.find(
      (candidate) =>
        candidate.tenantId === scoped &&
        candidate.rowId === rowId &&
        candidate.propertyId === propertyId,
    );
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(rowValues)
    .where(
      and(
        eq(rowValues.tenantId, scoped),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createRowValue(
  tenantId: string,
  input: CreateRowValueInput,
  repo?: SpaceRepository,
): Promise<RowValue> {
  const scoped = requireTenantId(tenantId);
  const row: RowValue = {
    tenantId: scoped,
    rowId: input.rowId,
    propertyId: input.propertyId,
    value: input.value ?? null,
  };
  if (repo) {
    repo.rowValues.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(rowValues)
    .values(row)
    .returning();
  return inserted;
}

export async function updateRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = repo.rowValues.find(
      (candidate) =>
        candidate.tenantId === scoped &&
        candidate.rowId === rowId &&
        candidate.propertyId === propertyId,
    );
    if (!row) {
      return null;
    }
    if (input.value !== undefined) row.value = input.value;
    return clone(row);
  }
  const [row] = await requireSpaceDb()
    .update(rowValues)
    .set({
      ...(input.value !== undefined ? { value: input.value } : {}),
    })
    .where(
      and(
        eq(rowValues.tenantId, scoped),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteRowValue(
  tenantId: string,
  rowId: string,
  propertyId: string,
  repo?: SpaceRepository,
): Promise<RowValue | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.rowValues.findIndex(
      (row) =>
        row.tenantId === scoped &&
        row.rowId === rowId &&
        row.propertyId === propertyId,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.rowValues.splice(index, 1);
    return clone(removed);
  }
  const [removed] = await requireSpaceDb()
    .delete(rowValues)
    .where(
      and(
        eq(rowValues.tenantId, scoped),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .returning();
  return removed ?? null;
}

export async function listViews(
  tenantId: string,
  repo?: SpaceRepository,
  opts?: ListViewsOpts,
): Promise<View[]> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    return repo.views
      .filter(
        (row) =>
          row.tenantId === scoped &&
          (opts?.databaseId === undefined ||
            row.databaseId === opts.databaseId),
      )
      .map(clone);
  }
  const filters = [
    eq(views.tenantId, scoped),
    ...(opts?.databaseId !== undefined
      ? [eq(views.databaseId, opts.databaseId)]
      : []),
  ];
  return requireSpaceDb()
    .select()
    .from(views)
    .where(and(...filters));
}

export async function getView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = repo.views.find(
      (candidate) =>
        candidate.tenantId === scoped &&
        candidate.databaseId === databaseId &&
        candidate.kind === kind,
    );
    return row ? clone(row) : null;
  }
  const [row] = await requireSpaceDb()
    .select()
    .from(views)
    .where(
      and(
        eq(views.tenantId, scoped),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createView(
  tenantId: string,
  input: CreateViewInput,
  repo?: SpaceRepository,
): Promise<View> {
  const scoped = requireTenantId(tenantId);
  const row: View = {
    tenantId: scoped,
    databaseId: input.databaseId,
    kind: input.kind,
    config: input.config ?? {},
  };
  if (repo) {
    repo.views.push(row);
    return clone(row);
  }
  const [inserted] = await requireSpaceDb()
    .insert(views)
    .values(row)
    .returning();
  return inserted;
}

export async function updateView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const row = repo.views.find(
      (candidate) =>
        candidate.tenantId === scoped &&
        candidate.databaseId === databaseId &&
        candidate.kind === kind,
    );
    if (!row) {
      return null;
    }
    if (input.config !== undefined) row.config = input.config;
    return clone(row);
  }
  const [row] = await requireSpaceDb()
    .update(views)
    .set({
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(
      and(
        eq(views.tenantId, scoped),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteView(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  repo?: SpaceRepository,
): Promise<View | null> {
  const scoped = requireTenantId(tenantId);
  if (repo) {
    const index = repo.views.findIndex(
      (row) =>
        row.tenantId === scoped &&
        row.databaseId === databaseId &&
        row.kind === kind,
    );
    if (index === -1) {
      return null;
    }
    const [removed] = repo.views.splice(index, 1);
    return clone(removed);
  }
  const [removed] = await requireSpaceDb()
    .delete(views)
    .where(
      and(
        eq(views.tenantId, scoped),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .returning();
  return removed ?? null;
}
