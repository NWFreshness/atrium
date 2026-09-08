import { describe, expect, it } from "vitest";
import { createMemorySpaceRepository, createPage } from "./queries";
import { buildPageTree, firstSidebarPageId, pagesForSidebar } from "./tree";

const tenantA = "tenant-a";

describe("pagesForSidebar", () => {
  it("omits row pages from the tree", async () => {
    const repo = createMemorySpaceRepository();
    const database = await createPage(
      tenantA,
      { title: "Tasks", type: "database" },
      repo,
    );
    await createPage(
      tenantA,
      { title: "A row", type: "row", parentId: database.id },
      repo,
    );

    const visible = pagesForSidebar(repo.pages);
    expect(visible.map((page) => page.title)).toEqual(["Tasks"]);
  });
});

describe("buildPageTree", () => {
  it("nests pages by parentId and sorts siblings by position", async () => {
    const repo = createMemorySpaceRepository();
    const projects = await createPage(
      tenantA,
      { title: "Projects", icon: "🗂️" },
      repo,
    );
    const garden = await createPage(
      tenantA,
      { title: "Garden", parentId: projects.id, icon: "🌱" },
      repo,
    );
    await createPage(
      tenantA,
      { title: "Calendar", parentId: garden.id, icon: "📅" },
      repo,
    );
    await createPage(tenantA, { title: "Home", icon: "🏠" }, repo);

    const tree = buildPageTree(repo.pages);
    expect(tree.map((node) => node.title)).toEqual(["Projects", "Home"]);
    expect(tree[0]?.children.map((node) => node.title)).toEqual(["Garden"]);
    expect(tree[0]?.children[0]?.children.map((node) => node.title)).toEqual([
      "Calendar",
    ]);
    expect(firstSidebarPageId(tree)).toBe(projects.id);
  });
});
