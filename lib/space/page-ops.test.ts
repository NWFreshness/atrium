import { describe, expect, it } from "vitest";
import {
  createPageIn,
  deletePageIn,
  getPageIn,
  listPagesIn,
  renamePageIn,
} from "./page-ops";
import {
  createMemorySpaceStore,
  createPage,
  getPage,
  listPages,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("page session actions", () => {
  it("creates, lists, renames, and deletes using the session tenantId", async () => {
    const memory = createMemorySpaceStore();
    const created = await createPageIn(
      tenantA,
      { title: "Home", icon: "🏠" },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.title).toBe("Home");
    expect(await getPage(tenantB, created.id, memory)).toBeNull();

    expect(await listPagesIn(tenantA, memory)).toEqual([created]);
    expect(await getPageIn(tenantA, created.id, memory)).toEqual(created);

    const renamed = await renamePageIn(tenantA, created.id, "HQ", memory);
    expect(renamed?.title).toBe("HQ");
    expect(renamed?.tenantId).toBe(tenantA);

    const deleted = await deletePageIn(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getPageIn(tenantA, created.id, memory)).toBeNull();
  });

  it("nests a created page under a session-tenant parent", async () => {
    const memory = createMemorySpaceStore();
    const parent = await createPageIn(tenantA, { title: "Projects" }, memory);
    const child = await createPageIn(
      tenantA,
      { title: "Garden", parentId: parent.id },
      memory,
    );

    expect(child.parentId).toBe(parent.id);
    expect(child.position).toBe(0);
  });

  it("refuses to nest under another tenant's page", async () => {
    const memory = createMemorySpaceStore();
    const other = await createPage(tenantB, { title: "Beta" }, memory);

    await expect(
      createPageIn(tenantA, { title: "Hacked", parentId: other.id }, memory),
    ).rejects.toThrow("Page not found");
  });

  it("returns null for missing or other-tenant pages", async () => {
    const memory = createMemorySpaceStore();
    const other = await createPage(tenantB, { title: "Beta" }, memory);

    expect(await getPageIn(tenantA, other.id, memory)).toBeNull();
    expect(await getPageIn(tenantA, "missing", memory)).toBeNull();
    expect(await renamePageIn(tenantA, other.id, "Hacked", memory)).toBeNull();
    expect(await deletePageIn(tenantA, other.id, memory)).toBeNull();
    expect(await getPage(tenantB, other.id, memory)).toMatchObject({
      title: "Beta",
    });
  });

  it("cascades nested pages on delete", async () => {
    const memory = createMemorySpaceStore();
    const parent = await createPageIn(tenantA, { title: "Projects" }, memory);
    const child = await createPageIn(
      tenantA,
      { title: "Garden", parentId: parent.id },
      memory,
    );
    const grandchild = await createPageIn(
      tenantA,
      { title: "Calendar", parentId: child.id },
      memory,
    );

    await deletePageIn(tenantA, parent.id, memory);

    expect(await getPageIn(tenantA, parent.id, memory)).toBeNull();
    expect(await getPageIn(tenantA, child.id, memory)).toBeNull();
    expect(await getPageIn(tenantA, grandchild.id, memory)).toBeNull();
    expect(await listPages(tenantA, memory)).toEqual([]);
  });
});
