import type { Page } from "./queries";

export type PageTreeNode = {
  id: string;
  title: string;
  icon: string | null;
  type: Page["type"];
  parentId: string | null;
  position: number;
  children: PageTreeNode[];
};

export function pagesForSidebar(pages: Page[]): Page[] {
  return pages.filter((page) => page.type !== "row");
}

export function buildPageTree(pages: Page[]): PageTreeNode[] {
  const visible = pagesForSidebar(pages);
  const byId = new Map<string, PageTreeNode>();

  for (const page of visible) {
    byId.set(page.id, {
      id: page.id,
      title: page.title,
      icon: page.icon,
      type: page.type,
      parentId: page.parentId,
      position: page.position,
      children: [],
    });
  }

  const roots: PageTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNodes(nodes: PageTreeNode[]): void {
    nodes.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    for (const node of nodes) {
      sortNodes(node.children);
    }
  }

  sortNodes(roots);
  return roots;
}

export function firstSidebarPageId(tree: PageTreeNode[]): string | null {
  return tree[0]?.id ?? null;
}

export function pageIdsWithChildren(tree: PageTreeNode[]): string[] {
  const ids: string[] = [];
  function walk(nodes: PageTreeNode[]) {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.push(node.id);
        walk(node.children);
      }
    }
  }
  walk(tree);
  return ids;
}

export function collectPageIds(tree: PageTreeNode[]): string[] {
  const ids: string[] = [];
  function walk(nodes: PageTreeNode[]) {
    for (const node of nodes) {
      ids.push(node.id);
      walk(node.children);
    }
  }
  walk(tree);
  return ids;
}
