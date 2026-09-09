import { describe, expect, it } from "vitest";
import {
  createDatabaseForSession,
  createPropertyForSession,
  createPropertyOptionForSession,
  createRowForSession,
  getDatabaseSnapshotForSession,
  setRowValueForSession,
} from "./database-actions";
import { createMemorySpaceRepository, createPage, listPages } from "./queries";
import {
  getViewsForSession,
  moveCardForSession,
  reorderRowsForSession,
  upsertViewForSession,
} from "./view-actions";
import { parseViewConfig } from "./view-logic";

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

describe("view session actions", () => {
  it("creates a view then updates config, ignoring client tenantId", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trip Planner", tenantId: tenantB },
      memory,
    );
    const status = await createPropertyForSession(
      getSessionA,
      { databaseId: database.id, name: "Status", type: "select" },
      memory,
    );

    const created = await upsertViewForSession(
      getSessionA,
      {
        databaseId: database.id,
        kind: "board",
        config: { groupPropertyId: status.id },
        tenantId: tenantB,
      },
      memory,
    );
    expect(created.tenantId).toBe(tenantA);
    expect(created.kind).toBe("board");
    expect(parseViewConfig(created.config).groupPropertyId).toBe(status.id);

    const updated = await upsertViewForSession(
      getSessionA,
      {
        databaseId: database.id,
        kind: "board",
        config: { groupPropertyId: status.id, sort: null, filters: [] },
      },
      memory,
    );
    expect(updated.kind).toBe("board");
    const views = await getViewsForSession(
      getSessionA,
      database.id,
      { tenantId: tenantB },
      memory,
    );
    expect(views).toHaveLength(1);
    expect(views[0]?.kind).toBe("board");
  });

  it("refuses other-tenant databases for views", async () => {
    const memory = createMemorySpaceRepository();
    const other = await createPage(
      tenantB,
      { title: "Secret DB", type: "database" },
      memory,
    );

    await expect(
      getViewsForSession(getSessionA, other.id, {}, memory),
    ).rejects.toThrow("Page not found");
    await expect(
      upsertViewForSession(
        getSessionA,
        { databaseId: other.id, kind: "table", config: {} },
        memory,
      ),
    ).rejects.toThrow("Page not found");
  });

  it("moves a card onto a grouping option and into none", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trips" },
      memory,
    );
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
    const planning = await createPropertyOptionForSession(
      getSessionA,
      { propertyId: status.id, name: "Planning", color: "blue" },
      memory,
    );
    const row = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "Japan, ten days" },
      memory,
    );
    await setRowValueForSession(
      getSessionA,
      { rowId: row.id, propertyId: status.id, value: booked.id },
      memory,
    );

    const moved = await moveCardForSession(
      getSessionA,
      {
        rowId: row.id,
        propertyId: status.id,
        optionId: planning.id,
        tenantId: tenantB,
      },
      memory,
    );
    expect(moved?.value).toBe(planning.id);

    const none = await moveCardForSession(
      getSessionA,
      { rowId: row.id, propertyId: status.id, optionId: null },
      memory,
    );
    expect(none?.value).toBeNull();
  });

  it("does not move another tenant's card", async () => {
    const memory = createMemorySpaceRepository();
    const ownDb = await createDatabaseForSession(
      getSessionA,
      { title: "Mine" },
      memory,
    );
    const ownProp = await createPropertyForSession(
      getSessionA,
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
      await moveCardForSession(
        getSessionA,
        { rowId: otherRow.id, propertyId: ownProp.id, optionId: "x" },
        memory,
      ),
    ).toBeNull();
  });

  it("reorders rows by rewriting positions", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trips" },
      memory,
    );
    const first = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "A" },
      memory,
    );
    const second = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "B" },
      memory,
    );
    const third = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "C" },
      memory,
    );

    const reordered = await reorderRowsForSession(
      getSessionA,
      database.id,
      [third.id, first.id, second.id],
      { tenantId: tenantB },
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
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trips" },
      memory,
    );
    const row = await createRowForSession(
      getSessionA,
      { databaseId: database.id, title: "A" },
      memory,
    );

    expect(
      await reorderRowsForSession(
        getSessionA,
        database.id,
        [row.id, "missing"],
        {},
        memory,
      ),
    ).toBeNull();
  });

  it("includes views on the database snapshot", async () => {
    const memory = createMemorySpaceRepository();
    const database = await createDatabaseForSession(
      getSessionA,
      { title: "Trips" },
      memory,
    );
    await upsertViewForSession(
      getSessionA,
      {
        databaseId: database.id,
        kind: "table",
        config: { sort: { propertyId: "budget", direction: "desc" } },
      },
      memory,
    );

    const snapshot = await getDatabaseSnapshotForSession(
      getSessionA,
      database.id,
      {},
      memory,
    );
    expect(snapshot.views).toHaveLength(1);
    expect(snapshot.views[0]?.kind).toBe("table");
  });
});
