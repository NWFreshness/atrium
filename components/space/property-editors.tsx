"use client";

import { OPTION_COLORS, type PropertyType } from "@/lib/space/constants";
import type { PropertyOption } from "@/lib/space/queries";
import styles from "./database-table.module.css";

const COLOR: Record<string, string> = {
  gray: "#737373",
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#a855f7",
  teal: "#14b8a6",
  orange: "#f97316",
};

export function optionColor(color: string): string {
  return COLOR[color] ?? COLOR.gray;
}

export function PropertyEditor({
  type,
  value,
  options,
  ariaLabel,
  onChange,
}: {
  type: PropertyType;
  value: unknown;
  options: PropertyOption[];
  ariaLabel: string;
  onChange: (value: unknown) => void;
}) {
  if (type === "checkbox") {
    return (
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={value === true}
        onChange={(event) => onChange(event.target.checked)}
      />
    );
  }
  if (type === "number") {
    return (
      <input
        type="number"
        className={styles["space-cell-input"]}
        aria-label={ariaLabel}
        value={typeof value === "number" ? value : ""}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === "" ? null : Number(next));
        }}
      />
    );
  }
  if (type === "date") {
    return (
      <input
        type="date"
        className={styles["space-cell-input"]}
        aria-label={ariaLabel}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
      />
    );
  }
  if (type === "select") {
    return (
      <select
        className={styles["space-cell-input"]}
        aria-label={ariaLabel}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }
  if (type === "multi_select") {
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div className={styles["space-multi"]}>
        {options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className={styles["space-chip"]}>
              <input
                type="checkbox"
                checked={checked}
                aria-label={`${ariaLabel} ${option.name}`}
                onChange={() => {
                  const next = checked
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id];
                  onChange(next);
                }}
              />
              <span style={{ color: optionColor(option.color) }}>
                {option.name}
              </span>
            </label>
          );
        })}
      </div>
    );
  }
  if (type === "url") {
    return (
      <input
        type="url"
        className={styles["space-cell-input"]}
        aria-label={ariaLabel}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
      />
    );
  }
  return (
    <input
      type="text"
      className={styles["space-cell-input"]}
      aria-label={ariaLabel}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export { OPTION_COLORS };
