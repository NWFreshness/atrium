"use client";

import { VIEW_KINDS, type ViewKind } from "@/lib/space/constants";
import styles from "./database-views.module.css";

const LABELS: Record<ViewKind, string> = {
  table: "Table",
  board: "Board",
  list: "List",
};

export function ViewSwitcher({
  current,
  onChange,
}: {
  current: ViewKind;
  onChange: (kind: ViewKind) => void;
}) {
  return (
    <div className={styles["space-view-switcher"]}>
      {VIEW_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={styles["space-view-switcher-button"]}
          aria-pressed={current === kind}
          onClick={() => onChange(kind)}
        >
          {LABELS[kind]}
        </button>
      ))}
    </div>
  );
}
