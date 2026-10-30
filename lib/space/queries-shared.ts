import type { InferSelectModel } from "drizzle-orm";
import type { BlockType, PageType, PropertyType, ViewKind } from "./constants";
import type {
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
  /**
   * The blocks the page opens with. Left out, a page or a row gets one empty
   * paragraph and a database gets none; an empty list means no blocks at all.
   */
  blocks?: Pick<CreateBlockInput, "type" | "content">[];
};

export type UpdatePageInput = Partial<Omit<CreatePageInput, "blocks">>;

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
  /** Only options of properties that belong to this database. */
  databaseId?: string;
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
  /** Only values of properties that belong to this database. */
  databaseId?: string;
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

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): Date {
  return new Date();
}

export function clone<T>(row: T): T {
  return structuredClone(row);
}

export function sameParent(
  pageParentId: string | null,
  parentId: string | null,
): boolean {
  return pageParentId === parentId;
}

export function compareByPositionThenId(
  a: { position: number; id: string },
  b: { position: number; id: string },
): number {
  if (a.position !== b.position) {
    return a.position - b.position;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function removeWhere<T>(
  rows: T[],
  predicate: (row: T) => boolean,
): void {
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (predicate(rows[i]!)) {
      rows.splice(i, 1);
    }
  }
}
