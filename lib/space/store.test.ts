import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createRecordingDb,
  statementSql,
  statementsMissingTenant,
} from "../db/batch-test-helpers";
import { getDatabaseSnapshotIn } from "./database-ops";
import {
  createBlock,
  createPage,
  createProperty,
  createPropertyOption,
  createRowValue,
  listPropertyOptions,
  listRowValues,
  insertBlockAt,
  listBlocks,
  listPages,
  reorderBlocks,
  reorderRows,
} from "./queries";
import { createDrizzleSpaceStore, createMemorySpaceStore } from "./store";

const tenant = "tenant-a";
const at = new Date(0);

describe("the Drizzle Space store scopes every statement to its tenant", () => {
  it("binds the tenant in every read, update and delete it builds", async () => {
    const { db, queries } = createRecordingDb();
    const store = createDrizzleSpaceStore(db);

    await store.pages.list(tenant);
    await store.pages.list(tenant, { parentId: "p0" });
    await store.pages.list(tenant, { parentId: null });
    await store.pages.get(tenant, "p1");
    await store.pages.insert({
      id: "p1",
      tenantId: tenant,
      parentId: null,
      type: "page",
      title: "Home",
      icon: null,
      position: 0,
      createdAt: at,
      updatedAt: at,
    });
    await store.pages.update(tenant, "p1", { title: "B" }, at);
    await store.pages.delete(tenant, "p1");
    await store.pages.nextPosition(tenant, null);
    await store.pages.nextPosition(tenant, "p0");

    await store.blocks.list(tenant);
    await store.blocks.list(tenant, { pageId: "p1" });
    await store.blocks.get(tenant, "b1");
    await store.blocks.insert({
      id: "b1",
      tenantId: tenant,
      pageId: "p1",
      type: "paragraph",
      content: {},
      position: 0,
    });
    await store.blocks.update(tenant, "b1", { position: 1 });
    await store.blocks.delete(tenant, "b1");
    await store.blocks.nextPosition(tenant, "p1");

    await store.properties.list(tenant);
    await store.properties.list(tenant, { databaseId: "p1" });
    await store.properties.get(tenant, "r1");
    await store.properties.insert({
      id: "r1",
      tenantId: tenant,
      databaseId: "p1",
      name: "Status",
      type: "select",
      position: 0,
    });
    await store.properties.update(tenant, "r1", { name: "B" });
    await store.properties.delete(tenant, "r1");
    await store.properties.nextPosition(tenant, "p1");

    await store.propertyOptions.list(tenant);
    await store.propertyOptions.list(tenant, { propertyId: "r1" });
    await store.propertyOptions.get(tenant, "o1");
    await store.propertyOptions.insert({
      id: "o1",
      tenantId: tenant,
      propertyId: "r1",
      name: "Todo",
      color: "gray",
      position: 0,
    });
    await store.propertyOptions.update(tenant, "o1", { name: "B" });
    await store.propertyOptions.delete(tenant, "o1");
    await store.propertyOptions.nextPosition(tenant, "r1");

    await store.rowValues.list(tenant);
    await store.rowValues.list(tenant, { rowId: "p2", propertyId: "r1" });
    await store.rowValues.get(tenant, "p2", "r1");
    await store.rowValues.insert({
      tenantId: tenant,
      rowId: "p2",
      propertyId: "r1",
      value: "x",
    });
    await store.rowValues.update(tenant, "p2", "r1", { value: "y" });
    await store.rowValues.delete(tenant, "p2", "r1");

    await store.views.list(tenant);
    await store.views.list(tenant, { databaseId: "p1" });
    await store.views.get(tenant, "p1", "board");
    await store.views.insert({
      tenantId: tenant,
      databaseId: "p1",
      kind: "board",
      config: {},
    });
    await store.views.update(tenant, "p1", "board", { config: {} });
    await store.views.delete(tenant, "p1", "board");

    expect(queries.length).toBeGreaterThanOrEqual(42);
    expect(statementsMissingTenant(queries, tenant)).toEqual([]);
  });
});

describe("reorders are one write", () => {
  const shapes = (statements: { sql: string }[]) =>
    statements.map(({ sql }) =>
      /^(\w+)(?: into)? "(\w+)"/.exec(sql)?.slice(1, 3).join(" "),
    );

  it("sends shifted positions and the new block as one batch", async () => {
    const { db, batches, queries } = createRecordingDb();
    await createDrizzleSpaceStore(db).blocks.reorder(
      tenant,
      [
        { id: "b1", position: 1 },
        { id: "b2", position: 2 },
      ],
      {
        id: "b0",
        tenantId: tenant,
        pageId: "p1",
        type: "paragraph",
        content: {},
        position: 0,
      },
    );

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const sent = batches[0]!.map(statementSql);
    expect(shapes(sent)).toEqual([
      "update blocks",
      "update blocks",
      "insert blocks",
    ]);
    expect(statementsMissingTenant(sent, tenant)).toEqual([]);
  });

  it("sends a row reorder as one batch of tenant-scoped page updates", async () => {
    const { db, batches, queries } = createRecordingDb();
    await createDrizzleSpaceStore(db).pages.reorder(
      tenant,
      [
        { id: "r2", position: 0 },
        { id: "r1", position: 1 },
      ],
      at,
    );

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const sent = batches[0]!.map(statementSql);
    expect(shapes(sent)).toEqual(["update pages", "update pages"]);
    expect(sent[0]!.sql).toContain('"position" = ');
    expect(sent[0]!.sql).toContain('"updatedAt" = ');
    expect(sent[0]!.params).toEqual(expect.arrayContaining([0, tenant, "r2"]));
    expect(statementsMissingTenant(sent, tenant)).toEqual([]);
  });

  it("drives insertBlockAt, reorderBlocks and reorderRows through reorder only", async () => {
    const memory = createMemorySpaceStore();
    const database = await createPage(
      tenant,
      { title: "Db", type: "database" },
      memory,
    );
    const page = await createPage(tenant, { title: "Doc", blocks: [] }, memory);
    const first = await createBlock(
      tenant,
      { pageId: page.id, type: "paragraph" },
      memory,
    );
    const rowA = await createPage(
      tenant,
      { title: "A", type: "row", parentId: database.id, blocks: [] },
      memory,
    );
    const rowB = await createPage(
      tenant,
      { title: "B", type: "row", parentId: database.id, blocks: [] },
      memory,
    );
    const single = () => {
      throw new Error("a reorder must not write rows one at a time");
    };
    memory.blocks.update = single;
    memory.blocks.insert = single;
    memory.pages.update = single;

    const inserted = await insertBlockAt(
      tenant,
      page.id,
      0,
      { type: "heading1" },
      memory,
    );
    expect(
      (await listBlocks(tenant, memory, { pageId: page.id }))
        .sort((a, b) => a.position - b.position)
        .map((block) => block.id),
    ).toEqual([inserted.id, first.id]);

    const swapped = await reorderBlocks(
      tenant,
      page.id,
      [first.id, inserted.id],
      memory,
    );
    expect(swapped?.map((block) => [block.id, block.position])).toEqual([
      [first.id, 0],
      [inserted.id, 1],
    ]);

    const rows = await reorderRows(
      tenant,
      database.id,
      [rowB.id, rowA.id],
      memory,
    );
    expect(rows?.map((row) => row.id)).toEqual([rowB.id, rowA.id]);
    expect(
      await reorderRows(tenant, database.id, [rowB.id], memory),
    ).toBeNull();
    expect(
      (await listPages(tenant, memory, { parentId: database.id })).map(
        (row) => row.position,
      ),
    ).toEqual([0, 1]);
  });
});

describe("row values and options can be listed for one database", () => {
  async function twoDatabases() {
    const memory = createMemorySpaceStore();
    const made = [];
    for (const title of ["Trips", "Books"]) {
      const database = await createPage(
        tenant,
        { title, type: "database" },
        memory,
      );
      const property = await createProperty(
        tenant,
        { databaseId: database.id, name: "Status", type: "select" },
        memory,
      );
      const option = await createPropertyOption(
        tenant,
        { propertyId: property.id, name: `${title} option`, color: "gray" },
        memory,
      );
      const row = await createPage(
        tenant,
        { title: `${title} row`, type: "row", parentId: database.id },
        memory,
      );
      await createRowValue(
        tenant,
        { rowId: row.id, propertyId: property.id, value: title },
        memory,
      );
      made.push({ database, property, option, row });
    }
    return { memory, trips: made[0]!, books: made[1]! };
  }

  it("filters by the owning database in memory", async () => {
    const { memory, trips, books } = await twoDatabases();

    expect(
      (
        await listRowValues(tenant, memory, { databaseId: trips.database.id })
      ).map((value) => value.value),
    ).toEqual(["Trips"]);
    expect(
      (
        await listPropertyOptions(tenant, memory, {
          databaseId: books.database.id,
        })
      ).map((option) => option.name),
    ).toEqual(["Books option"]);
    expect(
      await listRowValues("tenant-b", memory, {
        databaseId: trips.database.id,
      }),
    ).toEqual([]);
    expect(await listRowValues(tenant, memory)).toHaveLength(2);
  });

  it("filters through properties.databaseId in SQL, tenant-scoped on both tables", async () => {
    const { db, queries } = createRecordingDb();
    const store = createDrizzleSpaceStore(db);
    await store.rowValues.list(tenant, { databaseId: "db1" });
    await store.propertyOptions.list(tenant, { databaseId: "db1" });

    for (const [index, table] of ["rowValues", "propertyOptions"].entries()) {
      const { sql, params } = queries[index]!;
      expect(sql).toContain(`from "${table}"`);
      expect(sql).toMatch(
        /"propertyId" in \(select "id" from "properties" where .*"databaseId" = \$\d+\)/,
      );
      expect(params.filter((param) => param === tenant)).toHaveLength(2);
      expect(params).toContain("db1");
    }
    expect(statementsMissingTenant(queries, tenant)).toEqual([]);
  });

  it("loads only the opened database's values and options for a snapshot", async () => {
    const { memory, trips } = await twoDatabases();
    const asked: unknown[] = [];
    const values = memory.rowValues.list;
    const options = memory.propertyOptions.list;
    memory.rowValues.list = (t, opts) => {
      asked.push(opts);
      return values(t, opts);
    };
    memory.propertyOptions.list = (t, opts) => {
      asked.push(opts);
      return options(t, opts);
    };

    const snapshot = await getDatabaseSnapshotIn(
      tenant,
      trips.database.id,
      memory,
    );

    expect(asked).toEqual([
      { databaseId: trips.database.id },
      { databaseId: trips.database.id },
    ]);
    expect(snapshot.values.map((value) => value.value)).toEqual(["Trips"]);
    expect(snapshot.options.map((option) => option.name)).toEqual([
      "Trips option",
    ]);
  });
});

describe("a new page opens with a block", () => {
  it("gives a page and a row one empty paragraph, and a database none", async () => {
    const memory = createMemorySpaceStore();
    const database = await createPage(
      tenant,
      { title: "Db", type: "database" },
      memory,
    );
    const page = await createPage(tenant, { title: "Doc" }, memory);
    const row = await createPage(
      tenant,
      { title: "Row", type: "row", parentId: database.id },
      memory,
    );

    for (const owner of [page, row]) {
      expect(
        (await listBlocks(tenant, memory, { pageId: owner.id })).map(
          ({ type, content, position }) => ({ type, content, position }),
        ),
      ).toEqual([{ type: "paragraph", content: { text: "" }, position: 0 }]);
    }
    expect(await listBlocks(tenant, memory, { pageId: database.id })).toEqual(
      [],
    );
  });

  it("opens with the caller's blocks instead when it brings some, or none for an empty list", async () => {
    const memory = createMemorySpaceStore();
    const written = await createPage(
      tenant,
      {
        title: "Written",
        blocks: [
          { type: "heading1", content: { text: "Hello" } },
          { type: "divider" },
        ],
      },
      memory,
    );
    const bare = await createPage(
      tenant,
      { title: "Bare", blocks: [] },
      memory,
    );

    expect(
      (await listBlocks(tenant, memory, { pageId: written.id })).map(
        ({ type, position }) => [type, position],
      ),
    ).toEqual([
      ["heading1", 0],
      ["divider", 1],
    ]);
    expect(await listBlocks(tenant, memory, { pageId: bare.id })).toEqual([]);
    await expect(
      createPage(
        tenant,
        { title: "Bad", blocks: [{ type: "iframe" as never }] },
        memory,
      ),
    ).rejects.toMatchObject({ field: "type" });
    expect((await listPages(tenant, memory)).map((p) => p.title)).toEqual([
      "Written",
      "Bare",
    ]);
  });

  it("writes the page and its first block as one batch", async () => {
    const { db, batches, queries } = createRecordingDb();
    const page = await createPage(
      tenant,
      { title: "Doc", position: 0 },
      createDrizzleSpaceStore(db),
    );

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const sent = batches[0]!.map(statementSql);
    expect(
      sent.map(({ sql }) => /^insert into "(\w+)"/.exec(sql)?.[1]),
    ).toEqual(["pages", "blocks"]);
    expect(sent[1]!.params).toContain(page.id);
    expect(statementsMissingTenant(sent, tenant)).toEqual([]);
  });

  it("never writes while the page route renders", () => {
    const route = readFileSync(
      new URL("../../app/(authenticated)/space/[id]/page.tsx", import.meta.url),
      "utf8",
    );
    expect(route).not.toContain("createBlockAction");
    expect(route).not.toMatch(/\bcreate\w*Action\(/);
    expect(route.match(/listBlocksAction\(id\)/g)).toHaveLength(2);
  });
});
