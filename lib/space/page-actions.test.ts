import { describe, expect, it } from "vitest";
import {
  createPageForSession,
  deletePageForSession,
  getPageForSession,
  listPagesForSession,
  renamePageForSession,
} from "./page-actions";
import {
  createMemorySpaceRepository,
  createPage,
  getPage,
  listPages,
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

describe("page session actions", () => {
  it("creates, lists, renames, and deletes using the session tenantId", async () => {
    const memory = createMemorySpaceRepository();
    const created = await createPageForSession(
      getSessionA,
      { title: "Home", icon: "🏠", tenantId: tenantB },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.title).toBe("Home");
    expect(await getPage(tenantB, created.id, memory)).toBeNull();

    expect(await listPagesForSession(getSessionA, {}, memory)).toEqual([
      created,
    ]);
    expect(await getPageForSession(getSessionA, created.id, memory)).toEqual(
      created,
    );

    const renamed = await renamePageForSession(
      getSessionA,
      created.id,
      "HQ",
      { tenantId: tenantB },
      memory,
    );
    expect(renamed?.title).toBe("HQ");
    expect(renamed?.tenantId).toBe(tenantA);

    const deleted = await deletePageForSession(getSessionA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getPageForSession(getSessionA, created.id, memory)).toBeNull();
  });

  it("nests a created page under a session-tenant parent", async () => {
    const memory = createMemorySpaceRepository();
    const parent = await createPageForSession(
      getSessionA,
      { title: "Projects" },
      memory,
    );
    const child = await createPageForSession(
      getSessionA,
      { title: "Garden", parentId: parent.id },
      memory,
    );

    expect(child.parentId).toBe(parent.id);
    expect(child.position).toBe(0);
  });

  it("refuses to nest under another tenant's page", async () => {
    const memory = createMemorySpaceRepository();
    const other = await createPage(tenantB, { title: "Beta" }, memory);

    await expect(
      createPageForSession(
        getSessionA,
        { title: "Hacked", parentId: other.id },
        memory,
      ),
    ).rejects.toThrow("Page not found");
  });

  it("returns null for missing or other-tenant pages", async () => {
    const memory = createMemorySpaceRepository();
    const other = await createPage(tenantB, { title: "Beta" }, memory);

    expect(await getPageForSession(getSessionA, other.id, memory)).toBeNull();
    expect(await getPageForSession(getSessionA, "missing", memory)).toBeNull();
    expect(
      await renamePageForSession(getSessionA, other.id, "Hacked", {}, memory),
    ).toBeNull();
    expect(
      await deletePageForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(await getPage(tenantB, other.id, memory)).toMatchObject({
      title: "Beta",
    });
  });

  it("cascades nested pages on delete", async () => {
    const memory = createMemorySpaceRepository();
    const parent = await createPageForSession(
      getSessionA,
      { title: "Projects" },
      memory,
    );
    const child = await createPageForSession(
      getSessionA,
      { title: "Garden", parentId: parent.id },
      memory,
    );
    const grandchild = await createPageForSession(
      getSessionA,
      { title: "Calendar", parentId: child.id },
      memory,
    );

    await deletePageForSession(getSessionA, parent.id, memory);

    expect(await getPageForSession(getSessionA, parent.id, memory)).toBeNull();
    expect(await getPageForSession(getSessionA, child.id, memory)).toBeNull();
    expect(
      await getPageForSession(getSessionA, grandchild.id, memory),
    ).toBeNull();
    expect(await listPages(tenantA, memory)).toEqual([]);
  });

  it("throws when unauthenticated", async () => {
    const memory = createMemorySpaceRepository();
    await expect(
      createPageForSession(async () => null, { title: "Home" }, memory),
    ).rejects.toThrow("Unauthenticated");
  });
});
