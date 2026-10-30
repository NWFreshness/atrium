import { describe, expect, it } from "vitest";
import {
  createDatabaseIn,
  createPropertyIn,
  createPropertyOptionIn,
  createRowIn,
  getDatabaseSnapshotIn,
  setRowValueIn,
} from "./database-ops";
import { createMemorySpaceStore, createPage, listPages } from "./queries";
import {
  getViewsIn,
  moveCardIn,
  reorderRowsIn,
  upsertViewIn,
} from "./view-ops";
import { parseViewConfig } from "./view-logic";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("view session actions", () => {
  it("creates a view then updates config, ignoring client tenantId", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trip Planner" },
      memory,
    );
    const status = await createPropertyIn(
      tenantA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );

    const created = await upsertViewIn(
      tenantA,
      {
        databaseId: database.id,
        kind: "board",
        config: { groupPropertyId: status.id },
      },
      memory,
    );
    expect(created.tenantId).toBe(tenantA);
    expect(created.kind).toBe("board");
    expect(parseViewConfig(created.config).groupPropertyId).toBe(status.id);

    const updated = await upsertViewIn(
      tenantA,
      {
        databaseId: database.id,
        kind: "board",
        config: { groupPropertyId: status.id, sort: null, filters: [] },
      },
      memory,
    );
    expect(updated.kind).toBe("board");
    const views = await getViewsIn(tenantA, database.id, memory);
    expect(views).toHaveLength(1);
    expect(views[0]?.kind).toBe("board");
  });

  it("refuses other-tenant databases for views", async () => {
    const memory = createMemorySpaceStore();
    const other = await createPage(
      tenantB,
      { title: "Secret DB", type: "database" },
      memory,
    );

    await expect(getViewsIn(tenantA, other.id, memory)).rejects.toThrow(
      "Page not found",
    );
    await expect(
      upsertViewIn(
        tenantA,
        { databaseId: other.id, kind: "table", config: {} },
        memory,
      ),
    ).rejects.toThrow("Page not found");
  });

  it("moves a card onto a grouping option and into none", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trips" },
      memory,
    );
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
    const planning = await createPropertyOptionIn(
      tenantA,
      { propertyId: status.id, name: "Planning", color: "blue" },
      memory,
    );
    const row = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "Japan, ten days" },
      memory,
    );
    await setRowValueIn(
      tenantA,
      { rowId: row.id, propertyId: status.id, value: booked.id },
      memory,
    );

    const moved = await moveCardIn(
      tenantA,
      {
        rowId: row.id,
        propertyId: status.id,
        optionId: planning.id,
      },
      memory,
    );
    expect(moved?.value).toBe(planning.id);

    const none = await moveCardIn(
      tenantA,
      { rowId: row.id, propertyId: status.id, optionId: null },
      memory,
    );
    expect(none?.value).toBeNull();
  });

  it("does not move another tenant's card", async () => {
    const memory = createMemorySpaceStore();
    const ownDb = await createDatabaseIn(tenantA, { title: "Mine" }, memory);
    const ownProp = await createPropertyIn(
      tenantA,
      { databaseId: ownDb.id, name: "Status", type: "select" },
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
      await moveCardIn(
        tenantA,
        { rowId: otherRow.id, propertyId: ownProp.id, optionId: "x" },
        memory,
      ),
    ).toBeNull();
  });

  it("reorders rows by rewriting positions", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trips" },
      memory,
    );
    const first = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "A" },
      memory,
    );
    const second = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "B" },
      memory,
    );
    const third = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "C" },
      memory,
    );

    const reordered = await reorderRowsIn(
      tenantA,
      database.id,
      [third.id, first.id, second.id],
      memory,
    );
    expect(reordered?.map((page) => page.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
    expect(reordered?.map((page) => page.position)).toEqual([0, 1, 2]);

    const listed = await listPages(tenantA, memory, { parentId: database.id });
    expect(listed.map((page) => page.id)).toEqual([
      third.id,
      first.id,
      second.id,
    ]);
  });

  it("rejects a reorder that is not a permutation of the database rows", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trips" },
      memory,
    );
    const row = await createRowIn(
      tenantA,
      { databaseId: database.id, title: "A" },
      memory,
    );

    expect(
      await reorderRowsIn(tenantA, database.id, [row.id, "missing"], memory),
    ).toBeNull();
  });

  it("includes views on the database snapshot", async () => {
    const memory = createMemorySpaceStore();
    const database = await createDatabaseIn(
      tenantA,
      { title: "Trips" },
      memory,
    );
    await upsertViewIn(
      tenantA,
      {
        databaseId: database.id,
        kind: "table",
        config: { sort: { propertyId: "budget", direction: "desc" } },
      },
      memory,
    );

    const snapshot = await getDatabaseSnapshotIn(tenantA, database.id, memory);
    expect(snapshot.views).toHaveLength(1);
    expect(snapshot.views[0]?.kind).toBe("table");
  });
});
