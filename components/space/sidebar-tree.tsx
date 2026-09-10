"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createPageAction,
  deletePageAction,
  renamePageAction,
} from "@/lib/space/page-actions";
import { createDatabaseAction } from "@/lib/space/database-actions";
import { spacePageIdFromPath } from "@/lib/space/nav";
import {
  collectPageIds,
  pageIdsWithChildren,
  type PageTreeNode,
} from "@/lib/space/tree";
import { SpaceGlyph } from "./space-icons";
import styles from "./space-shell.module.css";

function countTree(
  nodes: PageTreeNode[],
): { pages: number; databases: number } {
  let pages = 0;
  let databases = 0;
  function walk(list: PageTreeNode[]) {
    for (const node of list) {
      if (node.type === "database") {
        databases += 1;
      } else {
        pages += 1;
      }
      walk(node.children);
    }
  }
  walk(nodes);
  return { pages, databases };
}

function displayTitle(title: string): string {
  return title.trim() === "" ? "Untitled" : title;
}

function TreeList({
  nodes,
  currentId,
  expanded,
  editingId,
  draft,
  onToggle,
  onStartRename,
  onDraftChange,
  onCommitRename,
  onDelete,
}: {
  nodes: PageTreeNode[];
  currentId: string | null;
  expanded: Set<string>;
  editingId: string | null;
  draft: string;
  onToggle: (id: string) => void;
  onStartRename: (node: PageTreeNode) => void;
  onDraftChange: (value: string) => void;
  onCommitRename: (id: string) => void;
  onDelete: (node: PageTreeNode) => void;
}) {
  return (
    <ul className={styles["space-sidebar-list"]}>
      {nodes.map((node) => {
        const current = currentId === node.id;
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(node.id);
        const label = displayTitle(node.title);
        return (
          <li key={node.id}>
            <div
              className={
                current
                  ? `${styles["space-sidebar-item"]} ${styles["space-sidebar-item-current"]}`
                  : styles["space-sidebar-item"]
              }
            >
              {hasChildren ? (
                <button
                  type="button"
                  className={styles["space-sidebar-toggle"]}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Collapse ${label}` : `Expand ${label}`}
                  onClick={() => onToggle(node.id)}
                >
                  {isOpen ? "▾" : "▸"}
                </button>
              ) : (
                <span className={styles["space-sidebar-toggle-spacer"]} />
              )}
              {editingId === node.id ? (
                <input
                  className={styles["space-sidebar-rename"]}
                  value={draft}
                  aria-label={`Rename ${label}`}
                  autoFocus
                  onChange={(event) => onDraftChange(event.target.value)}
                  onBlur={() => onCommitRename(node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <Link
                  href={`/space/${node.id}`}
                  className={styles["space-sidebar-link"]}
                  aria-current={current ? "page" : undefined}
                >
                  <span
                    className={styles["space-sidebar-glyph"]}
                    aria-hidden="true"
                  >
                    <SpaceGlyph type={node.type} />
                  </span>
                  {label}
                </Link>
              )}
              <button
                type="button"
                className={styles["space-sidebar-action"]}
                aria-label={`Rename ${label}`}
                onClick={() => onStartRename(node)}
              >
                Rename
              </button>
              <button
                type="button"
                className={styles["space-sidebar-action"]}
                aria-label={`Delete ${label}`}
                onClick={() => onDelete(node)}
              >
                Delete
              </button>
            </div>
            {hasChildren && isOpen ? (
              <TreeList
                nodes={node.children}
                currentId={currentId}
                expanded={expanded}
                editingId={editingId}
                draft={draft}
                onToggle={onToggle}
                onStartRename={onStartRename}
                onDraftChange={onDraftChange}
                onCommitRename={onCommitRename}
                onDelete={onDelete}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarTree({ tree }: { tree: PageTreeNode[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentId = spacePageIdFromPath(pathname);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(pageIdsWithChildren(tree)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setExpanded((previous) => {
      const next = new Set(previous);
      for (const id of pageIdsWithChildren(tree)) {
        next.add(id);
      }
      return next;
    });
  }, [tree]);

  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function createPage() {
    const created = await createPageAction({
      title: "",
      parentId: currentId,
    });
    router.push(`/space/${created.id}`);
    router.refresh();
  }

  async function createDatabase() {
    const created = await createDatabaseAction({
      title: "",
      parentId: currentId,
    });
    router.push(`/space/${created.id}`);
    router.refresh();
  }

  async function commitRename(id: string) {
    if (editingId !== id) {
      return;
    }
    const title = draft;
    setEditingId(null);
    await renamePageAction(id, title);
    router.refresh();
  }

  async function remove(node: PageTreeNode) {
    const label = displayTitle(node.title);
    if (!confirm(`Delete ${label}?`)) {
      return;
    }
    const descendantIds = new Set(collectPageIds([node]));
    await deletePageAction(node.id);
    if (currentId && descendantIds.has(currentId)) {
      router.push("/space");
    }
    router.refresh();
  }

  const { pages, databases } = countTree(tree);

  return (
    <>
      <div className={styles["space-sidebar-toolbar"]}>
        <button
          type="button"
          className={styles["space-sidebar-new"]}
          aria-label="New page"
          onClick={() => {
            void createPage();
          }}
        >
          New page
        </button>
        <button
          type="button"
          className={styles["space-sidebar-new"]}
          aria-label="New database"
          onClick={() => {
            void createDatabase();
          }}
        >
          New database
        </button>
      </div>
      {tree.length === 0 ? (
        <p className={styles["space-sidebar-empty"]}>No pages</p>
      ) : (
        <TreeList
          nodes={tree}
          currentId={currentId}
          expanded={expanded}
          editingId={editingId}
          draft={draft}
          onToggle={toggle}
          onStartRename={(node) => {
            setEditingId(node.id);
            setDraft(node.title);
          }}
          onDraftChange={setDraft}
          onCommitRename={(id) => {
            void commitRename(id);
          }}
          onDelete={(node) => {
            void remove(node);
          }}
        />
      )}
      <p className={styles["space-sidebar-footer"]}>
        {pages} page{pages === 1 ? "" : "s"} · {databases} database
        {databases === 1 ? "" : "s"}
      </p>
    </>
  );
}
