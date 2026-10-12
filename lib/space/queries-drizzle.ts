import { and, eq, inArray, isNull, max } from "drizzle-orm";
import type { Database } from "../db";
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
} from "./queries-shared";
import {
  blocks,
  pages,
  properties,
  propertyOptions,
  rowValues,
  views,
} from "./schema";

function tenantRow(
  table:
    typeof pages | typeof blocks | typeof properties | typeof propertyOptions,
  tenantId: string,
  id: string,
) {
  return and(eq(table.tenantId, tenantId), eq(table.id, id));
}

export async function nextPagePositionInDrizzle(
  db: Database,
  tenantId: string,
  parentId: string | null,
): Promise<number> {
  const parentFilter =
    parentId === null ? isNull(pages.parentId) : eq(pages.parentId, parentId);
  const [agg] = await db
    .select({ maxOrder: max(pages.position) })
    .from(pages)
    .where(and(eq(pages.tenantId, tenantId), parentFilter));
  return agg?.maxOrder == null ? 0 : agg.maxOrder + 1;
}

export async function nextBlockPositionInDrizzle(
  db: Database,
  tenantId: string,
  pageId: string,
): Promise<number> {
  const [agg] = await db
    .select({ maxOrder: max(blocks.position) })
    .from(blocks)
    .where(and(eq(blocks.tenantId, tenantId), eq(blocks.pageId, pageId)));
  const maxOrder = agg?.maxOrder ?? null;
  return maxOrder == null ? 0 : maxOrder + 1;
}

export async function nextPropertyPositionInDrizzle(
  db: Database,
  tenantId: string,
  databaseId: string,
): Promise<number> {
  const [agg] = await db
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
  db: Database,
  tenantId: string,
  propertyId: string,
): Promise<number> {
  const [agg] = await db
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
  db: Database,
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
  return db
    .select()
    .from(pages)
    .where(and(...filters))
    .orderBy(pages.position, pages.id);
}

export async function getPageInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const [row] = await db
    .select()
    .from(pages)
    .where(tenantRow(pages, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertPage(db: Database, row: Page): Promise<Page> {
  const [inserted] = await db.insert(pages).values(row).returning();
  return inserted;
}

export async function updatePageInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
  input: UpdatePageInput,
  updatedAt: Date,
): Promise<Page | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  id: string,
): Promise<Page | null> {
  const [removed] = await db
    .delete(pages)
    .where(tenantRow(pages, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listBlocksInDrizzle(
  db: Database,
  tenantId: string,
  opts?: ListBlocksOpts,
): Promise<Block[]> {
  const filters = [
    eq(blocks.tenantId, tenantId),
    ...(opts?.pageId !== undefined ? [eq(blocks.pageId, opts.pageId)] : []),
  ];
  return db
    .select()
    .from(blocks)
    .where(and(...filters))
    .orderBy(blocks.position, blocks.id);
}

export async function getBlockInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const [row] = await db
    .select()
    .from(blocks)
    .where(tenantRow(blocks, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertBlock(db: Database, row: Block): Promise<Block> {
  const [inserted] = await db.insert(blocks).values(row).returning();
  return inserted;
}

export async function updateBlockInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
  input: UpdateBlockInput,
): Promise<Block | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  id: string,
): Promise<Block | null> {
  const [removed] = await db
    .delete(blocks)
    .where(tenantRow(blocks, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listPropertiesInDrizzle(
  db: Database,
  tenantId: string,
  opts?: ListPropertiesOpts,
): Promise<Property[]> {
  const filters = [
    eq(properties.tenantId, tenantId),
    ...(opts?.databaseId !== undefined
      ? [eq(properties.databaseId, opts.databaseId)]
      : []),
  ];
  return db
    .select()
    .from(properties)
    .where(and(...filters))
    .orderBy(properties.position, properties.id);
}

export async function getPropertyInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const [row] = await db
    .select()
    .from(properties)
    .where(tenantRow(properties, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertProperty(
  db: Database,
  row: Property,
): Promise<Property> {
  const [inserted] = await db.insert(properties).values(row).returning();
  return inserted;
}

export async function updatePropertyInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
): Promise<Property | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  id: string,
): Promise<Property | null> {
  const [removed] = await db
    .delete(properties)
    .where(tenantRow(properties, tenantId, id))
    .returning();
  return removed ?? null;
}

/** Subquery: the ids of one database's properties, inside the tenant. */
function propertyIdsOf(db: Database, tenantId: string, databaseId: string) {
  return db
    .select({ id: properties.id })
    .from(properties)
    .where(
      and(
        eq(properties.tenantId, tenantId),
        eq(properties.databaseId, databaseId),
      ),
    );
}

export async function listPropertyOptionsInDrizzle(
  db: Database,
  tenantId: string,
  opts?: ListPropertyOptionsOpts,
): Promise<PropertyOption[]> {
  const filters = [
    eq(propertyOptions.tenantId, tenantId),
    ...(opts?.propertyId !== undefined
      ? [eq(propertyOptions.propertyId, opts.propertyId)]
      : []),
    ...(opts?.databaseId !== undefined
      ? [
          inArray(
            propertyOptions.propertyId,
            propertyIdsOf(db, tenantId, opts.databaseId),
          ),
        ]
      : []),
  ];
  return db
    .select()
    .from(propertyOptions)
    .where(and(...filters))
    .orderBy(propertyOptions.position, propertyOptions.id);
}

export async function getPropertyOptionInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const [row] = await db
    .select()
    .from(propertyOptions)
    .where(tenantRow(propertyOptions, tenantId, id))
    .limit(1);
  return row ?? null;
}

export async function insertPropertyOption(
  db: Database,
  row: PropertyOption,
): Promise<PropertyOption> {
  const [inserted] = await db.insert(propertyOptions).values(row).returning();
  return inserted;
}

export async function updatePropertyOptionInDrizzle(
  db: Database,
  tenantId: string,
  id: string,
  input: UpdatePropertyOptionInput,
): Promise<PropertyOption | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  id: string,
): Promise<PropertyOption | null> {
  const [removed] = await db
    .delete(propertyOptions)
    .where(tenantRow(propertyOptions, tenantId, id))
    .returning();
  return removed ?? null;
}

export async function listRowValuesInDrizzle(
  db: Database,
  tenantId: string,
  opts?: ListRowValuesOpts,
): Promise<RowValue[]> {
  const filters = [
    eq(rowValues.tenantId, tenantId),
    ...(opts?.rowId !== undefined ? [eq(rowValues.rowId, opts.rowId)] : []),
    ...(opts?.propertyId !== undefined
      ? [eq(rowValues.propertyId, opts.propertyId)]
      : []),
    ...(opts?.databaseId !== undefined
      ? [
          inArray(
            rowValues.propertyId,
            propertyIdsOf(db, tenantId, opts.databaseId),
          ),
        ]
      : []),
  ];
  return db
    .select()
    .from(rowValues)
    .where(and(...filters));
}

export async function getRowValueInDrizzle(
  db: Database,
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const [row] = await db
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
  db: Database,
  row: RowValue,
): Promise<RowValue> {
  const [inserted] = await db.insert(rowValues).values(row).returning();
  return inserted;
}

export async function updateRowValueInDrizzle(
  db: Database,
  tenantId: string,
  rowId: string,
  propertyId: string,
  input: UpdateRowValueInput,
): Promise<RowValue | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  rowId: string,
  propertyId: string,
): Promise<RowValue | null> {
  const [removed] = await db
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
  db: Database,
  tenantId: string,
  opts?: ListViewsOpts,
): Promise<View[]> {
  const filters = [
    eq(views.tenantId, tenantId),
    ...(opts?.databaseId !== undefined
      ? [eq(views.databaseId, opts.databaseId)]
      : []),
  ];
  return db
    .select()
    .from(views)
    .where(and(...filters));
}

export async function getViewInDrizzle(
  db: Database,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const [row] = await db
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

export async function insertView(db: Database, row: View): Promise<View> {
  const [inserted] = await db.insert(views).values(row).returning();
  return inserted;
}

export async function updateViewInDrizzle(
  db: Database,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
  input: UpdateViewInput,
): Promise<View | null> {
  const [row] = await db
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
  db: Database,
  tenantId: string,
  databaseId: string,
  kind: ViewKind,
): Promise<View | null> {
  const [removed] = await db
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
