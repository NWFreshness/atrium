import { describe, expect, it } from "vitest";
import {
  createDatabaseForSession,
  createPropertyForSession,
  createPropertyOptionForSession,
  createRowForSession,
  deletePropertyForSession,
  deleteRowForSession,
  getDatabaseSnapshotForSession,
  setRowValueForSession,
} from "./database-actions";
import { createPageForSession } from "./page-actions";
import {
  createMemorySpaceRepository,
  createPage,
  getPage,
  listPropertyOptions,
  listRowValues,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

const sessionA = {
  user: {
    id: "user-a",
    tenantId: tenantA,
    role: "owner" as const,
  },
};

function getSessionA() {
  return Promise.resolve(sessionA);
}

describe("database session actions", () => {
  it("creates a database, properties, options, rows, and values on the session tenant", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trip Planner", tenantId: tenantB },
      memory,
    );
    expect(database.tenantId).toBe(tenantA);
    expect(database.type).toBe("database");
    expect(await getPage(tenantB, database.id, memory)).toBeNull();

    const status = await createPropertyForSession(
      getSessionA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );
    const booked = await createPropertyOptionForSession(
      getSessionA,
      { propertyId: status.id, name: "Booked", color: "green" },
      memory,
    );
    const row = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "Japan, ten days" },
      memory,
    );
    expect(row.type).toBe("row");
    expect(row.parentId).toBe(database.id);

    const value = await setRowValueForSession(
      getSessionA,
      { rowId: row.id, propertyId: status.id, value: booked.id },
      memory,
    );
    expect(value?.value).toBe(booked.id);

    const snapshot = await getDatabaseSnapshotForSession(
      getSessionA,
      database.id,
      {},
      memory,
    );
    expect(snapshot.rows.map((item) => item.title)).toEqual([
      "Japan, ten days",
    ]);
    expect(snapshot.values).toHaveLength(1);
    expect(snapshot.options.map((option) => option.name)).toEqual(["Booked"]);
  });

  it("isolates other-tenant databases", async () => {
    const memory = createMemorySpaceRepository();
    const other = await createPage(
      tenantB,
      { title: "Secret DB", type: "database" },
      memory,
    );

    await expect(
      getDatabaseSnapshotForSession(getSessionA, other.id, {}, memory),
    ).rejects.toThrow("Page not found");
    await expect(
      createPropertyForSession(
        getSessionA,
        { databaseId: other.id, name: "Status", type: "select" },
        memory,
      ),
    ).rejects.toThrow("Page not found");
    await expect(
      createRowForSession(
        getSessionA,
        { databaseId: other.id, title: "Hacked" },
        memory,
      ),
    ).rejects.toThrow("Page not found");
  });

  it("does not set a value using another tenant's row or property", async () => {
    const memory = createMemorySpaceRepository();
    const ownDb = await createDatabaseForSession(
      getSessionA,
      { title: "Mine" },
      memory,
    );
    const ownProp = await createPropertyForSession(
      getSessionA,
      { databaseId: ownDb.id, name: "Notes", type: "text" },
      memory,
    );
    const ownRow = await createRowForSession(
      getSessionA,
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
      await setRowValueForSession(
        getSessionA,
        { rowId: otherRow.id, propertyId: ownProp.id, value: "nope" },
        memory,
      ),
    ).toBeNull();
    expect(
      await deleteRowForSession(getSessionA, otherRow.id, memory),
    ).toBeNull();
    expect(await getPage(tenantB, otherRow.id, memory)).toMatchObject({
      title: "Other row",
    });
    expect(ownRow.id).toBeTruthy();
  });

  it("deletes a property and its options/values in memory", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "DB" },
      memory,
    );
    const status = await createPropertyForSession(
      getSessionA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );
    await createPropertyOptionForSession(
      getSessionA,
      { propertyId: status.id, name: "Todo", color: "gray" },
      memory,
    );
    const row = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "Item" },
      memory,
    );
    await setRowValueForSession(
      getSessionA,
      { rowId: row.id, propertyId: status.id, value: "x" },
      memory,
    );

    await deletePropertyForSession(getSessionA, status.id, memory);
    expect(await listPropertyOptions(tenantA, memory)).toEqual([]);
    expect(await listRowValues(tenantA, memory)).toEqual([]);
  });

  it("refuses to treat a normal page as a database", async () => {
    const memory = createMemorySpaceRepository();
    const page = await createPageForSession(
      getSessionA,
      { title: "Home" },
      memory,
    );
    await expect(
      createRowForSession(
        getSessionA,
        { databaseId: page.id, title: "Nope" },
        memory,
      ),
    ).rejects.toThrow("Page not found");
  });
});
