"use client";

import type { BlockType } from "@/lib/space/constants";
import { filterBlockMenu } from "@/lib/space/constants";
import styles from "./editor.module.css";

export function SlashMenu({
  query,
  selectedIndex,
  onHover,
  onSelect,
}: {
  query: string;
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (type: BlockType) => void;
}) {
  const items = filterBlockMenu(query);
  if (items.length === 0) {
    return (
      <div
        className={styles["space-slash"]}
        role="listbox"
        aria-label="Slash menu"
      >
        <p className={styles["space-slash-empty"]}>No matches</p>
      </div>
    );
  }

  return (
    <ul
      className={styles["space-slash"]}
      role="listbox"
      aria-label="Slash menu"
    >
      {items.map((item, index) => (
        <li key={item.type}>
          <button
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={
              index === selectedIndex
                ? `${styles["space-slash-item"]} ${styles["space-slash-item-current"]}`
                : styles["space-slash-item"]
            }
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(item.type);
            }}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
