"use client";

import type { ReactNode } from "react";
import { QuickFind } from "./quick-find";
import { SidebarTree } from "./sidebar-tree";
import type { PageTreeNode } from "@/lib/space/tree";
import styles from "./space-shell.module.css";

export function SpaceShell({
  tree,
  children,
}: {
  tree: PageTreeNode[];
  children: ReactNode;
}) {
  return (
    <div className={styles["space-shell"]}>
      <aside className={styles["space-sidebar"]} aria-label="Space pages">
        <div className={styles["space-sidebar-header"]}>
          <p className={styles["space-sidebar-title"]}>Pages</p>
          <QuickFind />
        </div>
        <SidebarTree tree={tree} />
      </aside>
      <div className={styles["space-page"]}>{children}</div>
    </div>
  );
}
