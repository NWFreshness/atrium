import type { Database } from "../db";
import { createWriteBatch } from "../db/batch-transaction";
import type { ViewKind } from "./constants";
import * as drizzle from "./queries-drizzle";
import * as memory from "./queries-memory";
import { blocks, pages } from "./schema";
import type {
  Block,
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

/** A table keyed by `id`, ordered by a `position` among its siblings. */
type Table<Row, Patch, Opts> = {
  list(tenantId: string, opts?: Opts): Promise<Row[]>;
  get(tenantId: string, id: string): Promise<Row | null>;
  insert(row: Row): Promise<Row>;
  update(tenantId: string, id: string, patch: Patch): Promise<Row | null>;
  delete(tenantId: string, id: string): Promise<Row | null>;
  /** The position after the last sibling under `parentId`. */
  nextPosition(tenantId: string, parentId: string): Promise<number>;
};

export type Placement = { id: string; position: number };

/** A table keyed by a pair instead of an id. */
type PairTable<Row, Patch, Opts, A, B> = {
  list(tenantId: string, opts?: Opts): Promise<Row[]>;
  get(tenantId: string, a: A, b: B): Promise<Row | null>;
  insert(row: Row): Promise<Row>;
  update(tenantId: string, a: A, b: B, patch: Patch): Promise<Row | null>;
  delete(tenantId: string, a: A, b: B): Promise<Row | null>;
};

/**
 * Everything Space asks of its storage. Every read and every keyed write takes
 * the tenant first; the rules (validation, defaults, references) live above
 * this seam in `queries.ts`, so both adapters only store and fetch.
 */
export type SpaceStore = {
  pages: Omit<
    Table<Page, UpdatePageInput, ListPagesOpts>,
    "insert" | "update" | "nextPosition"
  > & {
    /** The page and the blocks it opens with, all or nothing. */
    insert(row: Page, blocks?: Block[]): Promise<Page>;
    update(
      tenantId: string,
      id: string,
      patch: UpdatePageInput,
      updatedAt: Date,
    ): Promise<Page | null>;
    nextPosition(tenantId: string, parentId: string | null): Promise<number>;
    /** New positions for sibling pages, all or nothing. */
    reorder(
      tenantId: string,
      positions: Placement[],
      updatedAt: Date,
    ): Promise<void>;
  };
  blocks: Table<Block, UpdateBlockInput, ListBlocksOpts> & {
    /** New positions, plus at most one new block landing among them, all or nothing. */
    reorder(
      tenantId: string,
      positions: Placement[],
      insert?: Block,
    ): Promise<void>;
  };
  properties: Table<Property, UpdatePropertyInput, ListPropertiesOpts>;
  propertyOptions: Table<
    PropertyOption,
    UpdatePropertyOptionInput,
    ListPropertyOptionsOpts
  >;
  /** Keyed by (rowId, propertyId). */
  rowValues: PairTable<
    RowValue,
    UpdateRowValueInput,
    ListRowValuesOpts,
    string,
    string
  >;
  /** Keyed by (databaseId, kind). */
  views: PairTable<View, UpdateViewInput, ListViewsOpts, string, ViewKind>;
};

export function createMemorySpaceStore(
  rows: SpaceRepository = memory.createMemorySpaceRepository(),
): SpaceStore {
  const store: SpaceStore = {
    pages: {
      list: (t, opts) => memory.listPagesInMemory(rows, t, opts),
      get: (t, id) => memory.getPageInMemory(rows, t, id),
      insert: async (row, opening = []) => {
        const page = await memory.createPageInMemory(rows, row);
        for (const block of opening) {
          await store.blocks.insert(block);
        }
        return page;
      },
      update: (t, id, patch, updatedAt) =>
        memory.updatePageInMemory(rows, t, id, patch, updatedAt),
      delete: (t, id) => memory.deletePageInMemory(rows, t, id),
      nextPosition: async (t, parent) =>
        memory.nextPagePositionInMemory(rows, t, parent),
      reorder: async (t, positions, updatedAt) => {
        for (const { id, position } of positions) {
          await memory.updatePageInMemory(rows, t, id, { position }, updatedAt);
        }
      },
    },
    blocks: {
      list: (t, opts) => memory.listBlocksInMemory(rows, t, opts),
      get: (t, id) => memory.getBlockInMemory(rows, t, id),
      insert: (row) => memory.createBlockInMemory(rows, row),
      update: (t, id, patch) => memory.updateBlockInMemory(rows, t, id, patch),
      delete: (t, id) => memory.deleteBlockInMemory(rows, t, id),
      nextPosition: async (t, parent) =>
        memory.nextBlockPositionInMemory(rows, t, parent),
      reorder: async (t, positions, insert) => {
        for (const { id, position } of positions) {
          await memory.updateBlockInMemory(rows, t, id, { position });
        }
        if (insert) {
          await memory.createBlockInMemory(rows, insert);
        }
      },
    },
    properties: {
      list: (t, opts) => memory.listPropertiesInMemory(rows, t, opts),
      get: (t, id) => memory.getPropertyInMemory(rows, t, id),
      insert: (row) => memory.createPropertyInMemory(rows, row),
      update: (t, id, patch) =>
        memory.updatePropertyInMemory(rows, t, id, patch),
      delete: (t, id) => memory.deletePropertyInMemory(rows, t, id),
      nextPosition: async (t, parent) =>
        memory.nextPropertyPositionInMemory(rows, t, parent),
    },
    propertyOptions: {
      list: (t, opts) => memory.listPropertyOptionsInMemory(rows, t, opts),
      get: (t, id) => memory.getPropertyOptionInMemory(rows, t, id),
      insert: (row) => memory.createPropertyOptionInMemory(rows, row),
      update: (t, id, patch) =>
        memory.updatePropertyOptionInMemory(rows, t, id, patch),
      delete: (t, id) => memory.deletePropertyOptionInMemory(rows, t, id),
      nextPosition: async (t, parent) =>
        memory.nextPropertyOptionPositionInMemory(rows, t, parent),
    },
    rowValues: {
      list: (t, opts) => memory.listRowValuesInMemory(rows, t, opts),
      get: (t, rowId, propertyId) =>
        memory.getRowValueInMemory(rows, t, rowId, propertyId),
      insert: (row) => memory.createRowValueInMemory(rows, row),
      update: (t, rowId, propertyId, patch) =>
        memory.updateRowValueInMemory(rows, t, rowId, propertyId, patch),
      delete: (t, rowId, propertyId) =>
        memory.deleteRowValueInMemory(rows, t, rowId, propertyId),
    },
    views: {
      list: (t, opts) => memory.listViewsInMemory(rows, t, opts),
      get: (t, databaseId, kind) =>
        memory.getViewInMemory(rows, t, databaseId, kind),
      insert: (row) => memory.createViewInMemory(rows, row),
      update: (t, databaseId, kind, patch) =>
        memory.updateViewInMemory(rows, t, databaseId, kind, patch),
      delete: (t, databaseId, kind) =>
        memory.deleteViewInMemory(rows, t, databaseId, kind),
    },
  };
  return store;
}

export function createDrizzleSpaceStore(db: Database): SpaceStore {
  return {
    pages: {
      list: (t, opts) => drizzle.listPagesInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getPageInDrizzle(db, t, id),
      insert: async (row, opening = []) => {
        if (opening.length === 0) {
          return drizzle.insertPage(db, row);
        }
        const batch = createWriteBatch(() => db);
        batch.insert(pages, row);
        for (const block of opening) {
          batch.insert(blocks, block);
        }
        await batch.flush();
        return row;
      },
      update: (t, id, patch, updatedAt) =>
        drizzle.updatePageInDrizzle(db, t, id, patch, updatedAt),
      delete: (t, id) => drizzle.deletePageInDrizzle(db, t, id),
      nextPosition: (t, parent) =>
        drizzle.nextPagePositionInDrizzle(db, t, parent),
      reorder: async (t, positions, updatedAt) => {
        // One Neon batch is one transaction (ADR-0002): no gapped order on failure.
        const batch = createWriteBatch(() => db);
        for (const { id, position } of positions) {
          batch.update(pages, t, id, { position, updatedAt });
        }
        await batch.flush();
      },
    },
    blocks: {
      list: (t, opts) => drizzle.listBlocksInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getBlockInDrizzle(db, t, id),
      insert: (row) => drizzle.insertBlock(db, row),
      update: (t, id, patch) => drizzle.updateBlockInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deleteBlockInDrizzle(db, t, id),
      nextPosition: (t, parent) =>
        drizzle.nextBlockPositionInDrizzle(db, t, parent),
      reorder: async (t, positions, insert) => {
        const batch = createWriteBatch(() => db);
        for (const { id, position } of positions) {
          batch.update(blocks, t, id, { position });
        }
        if (insert) {
          batch.insert(blocks, insert);
        }
        await batch.flush();
      },
    },
    properties: {
      list: (t, opts) => drizzle.listPropertiesInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getPropertyInDrizzle(db, t, id),
      insert: (row) => drizzle.insertProperty(db, row),
      update: (t, id, patch) =>
        drizzle.updatePropertyInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deletePropertyInDrizzle(db, t, id),
      nextPosition: (t, parent) =>
        drizzle.nextPropertyPositionInDrizzle(db, t, parent),
    },
    propertyOptions: {
      list: (t, opts) => drizzle.listPropertyOptionsInDrizzle(db, t, opts),
      get: (t, id) => drizzle.getPropertyOptionInDrizzle(db, t, id),
      insert: (row) => drizzle.insertPropertyOption(db, row),
      update: (t, id, patch) =>
        drizzle.updatePropertyOptionInDrizzle(db, t, id, patch),
      delete: (t, id) => drizzle.deletePropertyOptionInDrizzle(db, t, id),
      nextPosition: (t, parent) =>
        drizzle.nextPropertyOptionPositionInDrizzle(db, t, parent),
    },
    rowValues: {
      list: (t, opts) => drizzle.listRowValuesInDrizzle(db, t, opts),
      get: (t, rowId, propertyId) =>
        drizzle.getRowValueInDrizzle(db, t, rowId, propertyId),
      insert: (row) => drizzle.insertRowValue(db, row),
      update: (t, rowId, propertyId, patch) =>
        drizzle.updateRowValueInDrizzle(db, t, rowId, propertyId, patch),
      delete: (t, rowId, propertyId) =>
        drizzle.deleteRowValueInDrizzle(db, t, rowId, propertyId),
    },
    views: {
      list: (t, opts) => drizzle.listViewsInDrizzle(db, t, opts),
      get: (t, databaseId, kind) =>
        drizzle.getViewInDrizzle(db, t, databaseId, kind),
      insert: (row) => drizzle.insertView(db, row),
      update: (t, databaseId, kind, patch) =>
        drizzle.updateViewInDrizzle(db, t, databaseId, kind, patch),
      delete: (t, databaseId, kind) =>
        drizzle.deleteViewInDrizzle(db, t, databaseId, kind),
    },
  };
}
