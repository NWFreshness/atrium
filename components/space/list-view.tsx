"use client";

import Link from "next/link";
import type { ViewProperty, ViewRow } from "@/lib/space/view-logic";
import styles from "./database-views.module.css";

function formatValue(row: ViewRow, property: ViewProperty): string {
  const value = row.values[property.id];
  if (value == null || value === "") {
    return "";
  }
  if (property.type === "checkbox") {
    return value === true ? "Yes" : "No";
  }
  if (property.type === "select") {
    return property.options.find((option) => option.id === value)?.name ?? "";
  }
  if (property.type === "multi_select" && Array.isArray(value)) {
    return value
      .map(
        (id) => property.options.find((option) => option.id === id)?.name ?? "",
      )
      .filter(Boolean)
      .join(", ");
  }
  return String(value);
}

export function ListView({
  rows,
  properties,
}: {
  rows: ViewRow[];
  properties: ViewProperty[];
}) {
  const extra = properties.find((property) => property.type !== "title");

  if (rows.length === 0) {
    return <p className={styles["space-empty"]}>No rows</p>;
  }

  return (
    <ul className={styles["space-list"]}>
      {rows.map((row) => (
        <li key={row.id} className={styles["space-list-item"]}>
          <Link
            className={styles["space-list-title"]}
            href={`/space/${row.id}`}
          >
            {row.title.trim() === "" ? "Untitled" : row.title}
          </Link>
          {extra ? (
            <span className={styles["space-list-property"]}>
              {extra.name}: {formatValue(row, extra) || "—"}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
