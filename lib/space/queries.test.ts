import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  PAGE_TYPES,
  PROPERTY_TYPES,
  VIEW_KINDS,
} from "./constants";
import {
  createBlock,
  createMemorySpaceRepository,
  createPage,
  createProperty,
  createPropertyOption,
  createRowValue,
  createView,
  deleteBlock,
  deletePage,
  deleteProperty,
  deletePropertyOption,
  deleteRowValue,
  deleteView,
  getBlock,
  getPage,
  getProperty,
  getPropertyOption,
  getRowValue,
  getView,
  listBlocks,
  listPages,
  listProperties,
  listPropertyOptions,
  listRowValues,
  listViews,
  updateBlock,
  updatePage,
  updateProperty,
  updatePropertyOption,
  updateRowValue,
  updateView,
} from "./queries";
import {
  blockTypeEnum,
  blocks,
  pageTypeEnum,
  pages,
  properties,
  propertyOptions,
  propertyTypeEnum,
  rowValues,
  viewKindEnum,
  views,
} from "./schema";
import { createWriteBatch } from "../db/batch-transaction";
import { createRecordingDb, statementSql } from "../db/batch-test-helpers";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemorySpaceRepository();
}

function fkOnDelete(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).foreignKeys.map((key) => {
    const ref = key.reference();
    return `${ref.columns[0]?.name}:${key.onDelete}`;
  });
}

describe("Space schema", () => {
  it("puts tenantId on every table", () => {
    for (const table of [
      pages,
      blocks,
      properties,
      propertyOptions,
      rowValues,
      views,
    ]) {
      expect(getTableColumns(table).tenantId).toBeDefined();
    }
  });

  it("uses constants for page, block, property, and view enums", () => {
    expect(pageTypeEnum.enumValues).toEqual([...PAGE_TYPES]);
    expect(blockTypeEnum.enumValues).toEqual([...BLOCK_TYPES]);
    expect(propertyTypeEnum.enumValues).toEqual([...PROPERTY_TYPES]);
    expect(viewKindEnum.enumValues).toEqual([...VIEW_KINDS]);
  });

  it("declares SQL cascade from pages to nested pages, blocks, properties, options, row values, and views", () => {
    expect(fkOnDelete(pages)).toEqual(
      expect.arrayContaining(["parentId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(blocks)).toEqual(
      expect.arrayContaining(["pageId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(properties)).toEqual(
      expect.arrayContaining(["databaseId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(propertyOptions)).toEqual(
      expect.arrayContaining(["propertyId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(rowValues)).toEqual(
      expect.arrayContaining([
        "rowId:cascade",
        "propertyId:cascade",
        "tenantId:restrict",
      ]),
    );
    expect(fkOnDelete(views)).toEqual(
      expect.arrayContaining(["databaseId:cascade", "tenantId:restrict"]),
    );
  });
});

describe("tenantId is required", () => {
  it("throws when tenantId is missing or empty on every query helper", async () => {
    const memory = repo();
    for (const tenantId of ["", "  "] as const) {
      await expect(listPages(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getPage(tenantId, "id", memory)).rejects.toThrow(/tenantId/);
      await expect(
        createPage(tenantId, { title: "Home" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updatePage(tenantId, "id", { title: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deletePage(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listBlocks(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getBlock(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createBlock(tenantId, { pageId: "p", type: "paragraph" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateBlock(tenantId, "id", { type: "quote" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteBlock(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listProperties(tenantId, memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(getProperty(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createProperty(
          tenantId,
          { databaseId: "d", name: "Status", type: "select" },
          memory,
        ),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateProperty(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteProperty(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listPropertyOptions(tenantId, memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(getPropertyOption(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createPropertyOption(
          tenantId,
          { propertyId: "p", name: "Todo", color: "gray" },
          memory,
        ),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updatePropertyOption(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        deletePropertyOption(tenantId, "id", memory),
      ).rejects.toThrow(/tenantId/);

      await expect(listRowValues(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getRowValue(tenantId, "r", "p", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createRowValue(tenantId, { rowId: "r", propertyId: "p" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateRowValue(tenantId, "r", "p", { value: "x" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteRowValue(tenantId, "r", "p", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listViews(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getView(tenantId, "d", "table", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createView(tenantId, { databaseId: "d", kind: "table" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateView(tenantId, "d", "table", { config: {} }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteView(tenantId, "d", "table", memory)).rejects.toThrow(
        /tenantId/,
      );
    }
  });
});

describe("pages CRUD", () => {
  it("creates, lists, gets, updates, and deletes within a tenant", async () => {
    const memory = repo();
    const created = await createPage(
      tenantA,
      { title: "Home", icon: "🏠" },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.type).toBe("page");
    expect(created.parentId).toBeNull();
    expect(created.position).toBe(0);
    expect(await listPages(tenantA, memory)).toEqual([created]);
    expect(await getPage(tenantA, created.id, memory)).toEqual(created);

    const updated = await updatePage(
      tenantA,
      created.id,
      { title: "HQ" },
      memory,
    );
    expect(updated?.title).toBe("HQ");
    expect(updated?.icon).toBe("🏠");

    const deleted = await deletePage(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getPage(tenantA, created.id, memory)).toBeNull();
  });

  it("filters by parentId when listing", async () => {
    const memory = repo();
    const home = await createPage(tenantA, { title: "Home" }, memory);
    const nested = await createPage(
      tenantA,
      { title: "Nested", parentId: home.id },
      memory,
    );
    await createPage(tenantB, { title: "Other Home" }, memory);

    expect(await listPages(tenantA, memory, { parentId: null })).toEqual([
      home,
    ]);
    expect(await listPages(tenantA, memory, { parentId: home.id })).toEqual([
      nested,
    ]);
  });
});

describe("page delete cascade", () => {
  it("removes nested pages, blocks, properties, options, row values, and views in memory", async () => {
    const memory = repo();
    const root = await createPage(tenantA, { title: "Projects" }, memory);
    const child = await createPage(
      tenantA,
      { title: "Garden", parentId: root.id },
      memory,
    );
    const grandchild = await createPage(
      tenantA,
      { title: "Calendar", parentId: child.id },
      memory,
    );
    const database = await createPage(
      tenantA,
      { title: "Tracker", type: "database", parentId: root.id },
      memory,
    );
    const row = await createPage(
      tenantA,
      { title: "Row", type: "row", parentId: database.id },
      memory,
    );
    const other = await createPage(tenantA, { title: "Keep" }, memory);
    const otherTenant = await createPage(tenantB, { title: "Beta" }, memory);

    await createBlock(
      tenantA,
      { pageId: grandchild.id, type: "paragraph", content: { text: "hi" } },
      memory,
    );
    const status = await createProperty(
      tenantA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );
    await createPropertyOption(
      tenantA,
      { propertyId: status.id, name: "Todo", color: "gray" },
      memory,
    );
    await createRowValue(
      tenantA,
      { rowId: row.id, propertyId: status.id, value: "Todo" },
      memory,
    );
    await createView(
      tenantA,
      { databaseId: database.id, kind: "table", config: { sort: "name" } },
      memory,
    );

    await deletePage(tenantA, root.id, memory);

    expect(await getPage(tenantA, root.id, memory)).toBeNull();
    expect(await getPage(tenantA, child.id, memory)).toBeNull();
    expect(await getPage(tenantA, grandchild.id, memory)).toBeNull();
    expect(await getPage(tenantA, database.id, memory)).toBeNull();
    expect(await getPage(tenantA, row.id, memory)).toBeNull();
    expect(await getPage(tenantA, other.id, memory)).toMatchObject({
      title: "Keep",
    });
    expect(await getPage(tenantB, otherTenant.id, memory)).toMatchObject({
      title: "Beta",
    });
    expect(await listBlocks(tenantA, memory)).toEqual([]);
    expect(await listProperties(tenantA, memory)).toEqual([]);
    expect(await listPropertyOptions(tenantA, memory)).toEqual([]);
    expect(await listRowValues(tenantA, memory)).toEqual([]);
    expect(await listViews(tenantA, memory)).toEqual([]);
  });
});

describe("tenant isolation", () => {
  it("prevents tenant A from reading or writing tenant B rows", async () => {
    const memory = repo();
    const pageB = await createPage(tenantB, { title: "Beta Home" }, memory);
    const blockB = await createBlock(
      tenantB,
      { pageId: pageB.id, type: "paragraph" },
      memory,
    );
    const propertyB = await createProperty(
      tenantB,
      { databaseId: pageB.id, name: "Status", type: "select" },
      memory,
    );
    const optionB = await createPropertyOption(
      tenantB,
      { propertyId: propertyB.id, name: "Todo", color: "gray" },
      memory,
    );
    await createRowValue(
      tenantB,
      { rowId: pageB.id, propertyId: propertyB.id, value: "Todo" },
      memory,
    );
    await createView(tenantB, { databaseId: pageB.id, kind: "board" }, memory);

    expect(await listPages(tenantA, memory)).toEqual([]);
    expect(await listBlocks(tenantA, memory)).toEqual([]);
    expect(await listProperties(tenantA, memory)).toEqual([]);
    expect(await listPropertyOptions(tenantA, memory)).toEqual([]);
    expect(await listRowValues(tenantA, memory)).toEqual([]);
    expect(await listViews(tenantA, memory)).toEqual([]);

    expect(await getPage(tenantA, pageB.id, memory)).toBeNull();
    expect(await getBlock(tenantA, blockB.id, memory)).toBeNull();
    expect(await getProperty(tenantA, propertyB.id, memory)).toBeNull();
    expect(await getPropertyOption(tenantA, optionB.id, memory)).toBeNull();
    expect(
      await getRowValue(tenantA, pageB.id, propertyB.id, memory),
    ).toBeNull();
    expect(await getView(tenantA, pageB.id, "board", memory)).toBeNull();

    expect(
      await updatePage(tenantA, pageB.id, { title: "Hacked" }, memory),
    ).toBeNull();
    expect(
      await updateBlock(tenantA, blockB.id, { type: "quote" }, memory),
    ).toBeNull();
    expect(
      await updateProperty(tenantA, propertyB.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(
      await updatePropertyOption(
        tenantA,
        optionB.id,
        { name: "Hacked" },
        memory,
      ),
    ).toBeNull();
    expect(
      await updateRowValue(
        tenantA,
        pageB.id,
        propertyB.id,
        { value: "Hacked" },
        memory,
      ),
    ).toBeNull();
    expect(
      await updateView(
        tenantA,
        pageB.id,
        "board",
        { config: { x: 1 } },
        memory,
      ),
    ).toBeNull();

    expect(await deletePage(tenantA, pageB.id, memory)).toBeNull();
    expect(await deleteBlock(tenantA, blockB.id, memory)).toBeNull();
    expect(await deleteProperty(tenantA, propertyB.id, memory)).toBeNull();
    expect(await deletePropertyOption(tenantA, optionB.id, memory)).toBeNull();
    expect(
      await deleteRowValue(tenantA, pageB.id, propertyB.id, memory),
    ).toBeNull();
    expect(await deleteView(tenantA, pageB.id, "board", memory)).toBeNull();

    expect(await getPage(tenantB, pageB.id, memory)).toMatchObject({
      title: "Beta Home",
    });
    expect(await getBlock(tenantB, blockB.id, memory)).toMatchObject({
      type: "paragraph",
    });
    expect(await getProperty(tenantB, propertyB.id, memory)).toMatchObject({
      name: "Status",
    });
    expect(await getPropertyOption(tenantB, optionB.id, memory)).toMatchObject({
      name: "Todo",
    });
    expect(
      await getRowValue(tenantB, pageB.id, propertyB.id, memory),
    ).toMatchObject({ value: "Todo" });
    expect(await getView(tenantB, pageB.id, "board", memory)).toMatchObject({
      kind: "board",
    });
  });
});

describe("a batched createPage", () => {
  const tenant = "tenant-batch-position";

  it("refuses a row whose position the database would have to answer", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    await expect(
      createPage(tenant, { title: "No position" }, undefined, { batch }),
    ).rejects.toThrow(/explicit `position`/);
    expect(batches).toHaveLength(0);
  });

  it("collects the insert when the caller brings a position", async () => {
    const { db } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    const page = await createPage(
      tenant,
      { title: "Planted", position: 7 },
      undefined,
      { batch },
    );

    expect(page.position).toBe(7);
    expect(batch.statements).toHaveLength(1);
    expect(statementSql(batch.statements[0]!).params).toContain(7);
  });
});

describe("text ceilings", () => {
  it("rejects a 20001-character block in the memory repo", async () => {
    const memory = repo();
    const page = await createPage(tenantA, { title: "Home" }, memory);
    await expect(
      createBlock(
        tenantA,
        {
          pageId: page.id,
          type: "paragraph",
          content: { text: "a".repeat(20_001) },
        },
        memory,
      ),
    ).rejects.toThrow("text too long");
  });
});
