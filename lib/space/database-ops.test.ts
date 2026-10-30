import { describe, expect, it } from "vitest";
import {
  createDatabaseIn,
  createPropertyIn,
  createPropertyOptionIn,
  createRowIn,
  deletePropertyIn,
  deleteRowIn,
  getDatabaseSnapshotIn,
  setRowValueIn,
} from "./database-ops";
import { createPageIn } from "./page-ops";
import {
  createMemorySpaceStore,
  createPage,
  getPage,
  listPropertyOptions,
  listRowValues,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("database session actions", () => {
  it("creates a database, properties, options, rows, and values on the session tenant", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trip Planner" },
      memory,
    );
    expect(database.tenantId).toBe(tenantA);
    expect(database.type).toBe("database");
    expect(await getPage(tenantB, database.id, memory)).toBeNull();

    const status = await createPropertyIn(
      tenantA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );
    const booked = await createPropertyOptionIn(
      tenantA,
      { propertyId: status.id, name: "Booked", color: "green" },
      memory,
    );
    const row = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "Japan, ten days" },
      memory,
    );
    expect(row.type).toBe("row");
    expect(row.parentId).toBe(database.id);

    const value = await setRowValueIn(
      tenantA,
      { rowId: row.id, propertyId: status.id, value: booked.id },
      memory,
    );
    expect(value?.value).toBe(booked.id);

    const snapshot = await getDatabaseSnapshotIn(tenantA, database.id, memory);
    expect(snapshot.rows.map((item) => item.title)).toEqual([
      "Japan, ten days",
    ]);
    expect(snapshot.values).toHaveLength(1);
    expect(snapshot.options.map((option) => option.name)).toEqual(["Booked"]);
  });

  it("isolates other-tenant databases", async () => {
    const memory = createMemorySpaceStore();
    const other = await createPage(
      tenantB,
      { title: "Secret DB", type: "database" },
      memory,
    );

    await expect(
      getDatabaseSnapshotIn(tenantA, other.id, memory),
    ).rejects.toThrow("Page not found");
    await expect(
      createPropertyIn(
        tenantA,
        { databaseId: other.id, name: "Status", type: "select" },
        memory,
      ),
    ).rejects.toThrow("Page not found");
    await expect(
      createRowIn(tenantA, { databaseId: other.id, title: "Hacked" }, memory),
    ).rejects.toThrow("Page not found");
  });

  it("does not set a value using another tenant's row or property", async () => {
    const memory = createMemorySpaceStore();
    const ownDb = await createDatabaseIn(tenantA, { title: "Mine" }, memory);
    const ownProp = await createPropertyIn(
      tenantA,
      { databaseId: ownDb.id, name: "Notes", type: "text" },
      memory,
    );
    const ownRow = await createRowIn(
      tenantA,
      { databaseId: ownDb.id, title: "Row" },
      memory,
    );
    const otherDb = await createPage(
      tenantB,
      { title: "Other", type: "database" },
      memory,
    );
    const otherRow = await createPage(
      tenantB,
      { title: "Other row", type: "row", parentId: otherDb.id },
      memory,
    );

    expect(
      await setRowValueIn(
        tenantA,
        { rowId: otherRow.id, propertyId: ownProp.id, value: "nope" },
        memory,
      ),
    ).toBeNull();
    expect(await deleteRowIn(tenantA, otherRow.id, memory)).toBeNull();
    expect(await getPage(tenantB, otherRow.id, memory)).toMatchObject({
      title: "Other row",
    });
    expect(ownRow.id).toBeTruthy();
  });

  it("deletes a property and its options/values in memory", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(tenantA, { title: "DB" }, memory);
    const status = await createPropertyIn(
      tenantA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );
    await createPropertyOptionIn(
      tenantA,
      { propertyId: status.id, name: "Todo", color: "gray" },
      memory,
    );
    const row = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "Item" },
      memory,
    );
    await setRowValueIn(
      tenantA,
      { rowId: row.id, propertyId: status.id, value: "x" },
      memory,
    );

    await deletePropertyIn(tenantA, status.id, memory);
    expect(await listPropertyOptions(tenantA, memory)).toEqual([]);
    expect(await listRowValues(tenantA, memory)).toEqual([]);
  });

  it("refuses to treat a normal page as a database", async () => {
    const memory = createMemorySpaceStore();
    const page = await createPageIn(tenantA, { title: "Home" }, memory);
    await expect(
      createRowIn(tenantA, { databaseId: page.id, title: "Nope" }, memory),
    ).rejects.toThrow("Page not found");
  });
});
