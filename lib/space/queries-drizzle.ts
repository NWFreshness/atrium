import { and, eq, isNull, max } from "drizzle-orm";
import { getDb } from "../db";
import type { WriteOpts } from "../db/batch-transaction";
import type { ViewKind } from "./constants";
import {
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
  type UpdateBlockInput,
  type UpdatePageInput,
  type UpdatePropertyInput,
  type UpdatePropertyOptionInput,
  type UpdateRowValueInput,
  type UpdateViewInput,
  type View,
  clone,
} from "./queries-shared";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";

function requireSpaceDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Space store required");
  }
  return getDb();
}

function tenantRow(
  table:
    typeof pages | typeof blocks | typeof properties | typeof propertyOptions,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

export async function nextPagePositionInDrizzle(
  tenantId: string,
  parentId: string | null,
): Promise<number> {
  const parentFilter =
    parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId);
  const [agg] = await requireSpaceDb()
    .select({ maxOrder: max(pages.position) })
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), parentFilter));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

export async function nextBlockPositionInDrizzle(
  tenantId: string,
  pageId: string,
): Promise<number> {
  const [agg] = await requireSpaceDb()
    .select({ maxOrder: max(blocks.position) })
    .from(blocks)
    .where(and(eq(blocks.tenantId, tenantId), eq(blocks.pageId, pageId)));
  const maxOrder = agg?.maxOrder ?? null;
  return maxOrder == null ? 0 : maxOrder + 1;
}

export async function nextPropertyPositionInDrizzle(
  tenantId: string,
  databaseId: string,
): Promise<number> {
  const [agg] = await requireSpaceDb()
    .select({ maxOrder: max(properties.position) })
    .from(properties)
    .where(
      and(
        eq(properties.tenantId, tenantId),
        eq(properties.databaseId, databaseId),
      ),
    );
  const maxOrder = agg?.maxOrder ?? null;
  return maxOrder == null ? 0 : maxOrder + 1;
}

export async function nextPropertyOptionPositionInDrizzle(
  tenantId: string,
  propertyId: string,
): Promise<number> {
  const [agg] = await requireSpaceDb()
    .select({ maxOrder: max(propertyOptions.position) })
    .from(propertyOptions)
    .where(
      and(
        eq(propertyOptions.tenantId, tenantId),
        eq(propertyOptions.propertyId, propertyId),
      ),
    );
  const maxOrder = agg?.maxOrder ?? null;
  return maxOrder == null ? 0 : maxOrder + 1;
}

export async function listPagesInDrizzle(
  tenantId: string,
  opts?: ListPagesOpts,
): Promise<Page[]> {
  const filters = [
    eq(pages.tenantId, tenantId),
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

export async function getPageInDrizzle(
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(pages)
    .where(tenantRow(pages, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertPage(row: Page, opts?: WriteOpts): Promise<Page> {
  if (opts?.batch) {
    opts.batch.insert(pages, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(pages)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePageInDrizzle(
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  updatedAt: Date,
): Promise<Page | null> {
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
    .where(tenantRow(pages, tenantId, id))
    .returning();
  return row ?? null;
}

export async function deletePageInDrizzle(
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const [removed] = await requireSpaceDb()
    .delete(pages)
    .where(tenantRow(pages, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listBlocksInDrizzle(
  tenantId: string,
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  const filters = [
    eq(blocks.tenantId, tenantId),
    ...(opts?.pageId !== undefined ? [eq(blocks.pageId, opts.pageId)] : []),
  ];
  return requireSpaceDb()
    .select()
    .from(blocks)
    .where(and(...filters))
    .orderBy(blocks.position, blocks.id);
}

export async function getBlockInDrizzle(
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(blocks)
    .where(tenantRow(blocks, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertBlock(
  row: Block,
  opts?: WriteOpts,
): Promise<Block> {
  if (opts?.batch) {
    opts.batch.insert(blocks, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(blocks)
    .values(row)
    .returning();
  return inserted;
}

export async function updateBlockInDrizzle(
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
): Promise<Block | null> {
  const [row] = await requireSpaceDb()
    .update(blocks)
    .set({
      ...(input.pageId !== undefined ? { pageId: input.pageId } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(blocks, tenantId, id))
    .returning();
  return row ?? null;
}

export async function deleteBlockInDrizzle(
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const [removed] = await requireSpaceDb()
    .delete(blocks)
    .where(tenantRow(blocks, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listPropertiesInDrizzle(
  tenantId: string,
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  const filters = [
    eq(properties.tenantId, tenantId),
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

export async function getPropertyInDrizzle(
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(properties)
    .where(tenantRow(properties, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertProperty(
  row: Property,
  opts?: WriteOpts,
): Promise<Property> {
  if (opts?.batch) {
    opts.batch.insert(properties, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(properties)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePropertyInDrizzle(
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
): Promise<Property | null> {
  const [row] = await requireSpaceDb()
    .update(properties)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(properties, tenantId, id))
    .returning();
  return row ?? null;
}

export async function deletePropertyInDrizzle(
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const [removed] = await requireSpaceDb()
    .delete(properties)
    .where(tenantRow(properties, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listPropertyOptionsInDrizzle(
  tenantId: string,
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  const filters = [
    eq(propertyOptions.tenantId, tenantId),
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

export async function getPropertyOptionInDrizzle(
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(propertyOptions)
    .where(tenantRow(propertyOptions, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertPropertyOption(
  row: PropertyOption,
  opts?: WriteOpts,
): Promise<PropertyOption> {
  if (opts?.batch) {
    opts.batch.insert(propertyOptions, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(propertyOptions)
    .values(row)
    .returning();
  return inserted;
}

export async function updatePropertyOptionInDrizzle(
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
): Promise<PropertyOption | null> {
  const [row] = await requireSpaceDb()
    .update(propertyOptions)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
    })
    .where(tenantRow(propertyOptions, tenantId, id))
    .returning();
  return row ?? null;
}

export async function deletePropertyOptionInDrizzle(
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const [removed] = await requireSpaceDb()
    .delete(propertyOptions)
    .where(tenantRow(propertyOptions, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listRowValuesInDrizzle(
  tenantId: string,
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  const filters = [
    eq(rowValues.tenantId, tenantId),
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

export async function getRowValueInDrizzle(
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(rowValues)
    .where(
      and(
        eq(rowValues.tenantId, tenantId),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertRowValue(
  row: RowValue,
  opts?: WriteOpts,
): Promise<RowValue> {
  if (opts?.batch) {
    opts.batch.insert(rowValues, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(rowValues)
    .values(row)
    .returning();
  return inserted;
}

export async function updateRowValueInDrizzle(
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
): Promise<RowValue | null> {
  const [row] = await requireSpaceDb()
    .update(rowValues)
    .set({
      ...(input.value !== undefined ? { value: input.value } : {}),
    })
    .where(
      and(
        eq(rowValues.tenantId, tenantId),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteRowValueInDrizzle(
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const [removed] = await requireSpaceDb()
    .delete(rowValues)
    .where(
      and(
        eq(rowValues.tenantId, tenantId),
        eq(rowValues.rowId, rowId),
        eq(rowValues.propertyId, propertyId),
      ),
    )
    .returning();
  return removed ?? null;
}

export async function listViewsInDrizzle(
  tenantId: string,
  opts?: ListViewsOpts,
): Promise<View[]> {
  const filters = [
    eq(views.tenantId, tenantId),
    ...(opts?.databaseId !== undefined
      ? [eq(views.databaseId, opts.databaseId)]
      : []),
  ];
  return requireSpaceDb()
    .select()
    .from(views)
    .where(and(...filters));
}

export async function getViewInDrizzle(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const [row] = await requireSpaceDb()
    .select()
    .from(views)
    .where(
      and(
        eq(views.tenantId, tenantId),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertView(row: View, opts?: WriteOpts): Promise<View> {
  if (opts?.batch) {
    opts.batch.insert(views, row);
    return clone(row);
  }

  const [inserted] = await requireSpaceDb()
    .insert(views)
    .values(row)
    .returning();
  return inserted;
}

export async function updateViewInDrizzle(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
): Promise<View | null> {
  const [row] = await requireSpaceDb()
    .update(views)
    .set({
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(
      and(
        eq(views.tenantId, tenantId),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteViewInDrizzle(
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const [removed] = await requireSpaceDb()
    .delete(views)
    .where(
      and(
        eq(views.tenantId, tenantId),
        eq(views.databaseId, databaseId),
        eq(views.kind, kind),
      ),
    )
    .returning();
  return removed ?? null;
}
