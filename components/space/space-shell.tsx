"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { spacePageIdFromPath } from "@/lib/space/nav";
import styles from "./space-shell.module.css";

export function SpaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageId = spacePageIdFromPath(pathname);

  return (
    <div className={styles["space-shell"]}>
      <aside className={styles["space-sidebar"]} aria-label="Space pages">
        <p className={styles["space-sidebar-title"]}>Pages</p>
        {pageId ? (
          <ul className={styles["space-sidebar-list"]}>
            <li>
              <div
                className={`${styles["space-sidebar-item"]} ${styles["space-sidebar-item-current"]}`}
                aria-current="page"
              >
                <span
                  className={styles["space-sidebar-glyph"]}
                  aria-hidden="true"
                >
                  ▣
                </span>
                Page
              </div>
            </li>
          </ul>
        ) : (
          <p className={styles["space-sidebar-empty"]}>No page selected</p>
        )}
      </aside>
      <div className={styles["space-page"]}>{children}</div>
    </div>
  );
}
