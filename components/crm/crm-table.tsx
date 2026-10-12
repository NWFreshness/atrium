"use client";

import {
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  type ReactTable,
  type RowData,
} from "@tanstack/react-table";
import styles from "./org.module.css";

/**
 * 11.4 — v9 sorting. `rowSortingFeature` must be registered **before** its
 * dependent `sortedRowModel` slot; dropping it while keeping the slot is a
 * type error (`ValidateFeatureSlots`), which is the card's injection probe #1.
 *
 * The one feature set every CRM list registers, so the chrome below can rely
 * on its columns being sortable.
 */
export const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

/**
 * The chrome every CRM list shares: the empty state, the sortable header with
 * its `aria-sort` and caret, and the body. Each table still owns its columns
 * and its copy; this owns how a sorted table is announced.
 */
export function CrmTable<TData extends RowData>({
  table,
  empty,
}: {
  table: ReactTable<typeof features, TData>;
  /** Shown instead of the table when there are no rows. */
  empty: string;
}) {
  if (table.getRowModel().rows.length === 0) {
    return <p className={styles["crm-empty"]}>{empty}</p>;
  }
  return (
    <div className={styles["crm-table-wrap"]}>
      <table className={styles["crm-table"]}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const sortable = header.column.getCanSort();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    // AC4: `aria-sort` is on the header **cell**, never
                    // on the button inside it. AC3: it is always one of
                    // the three values, `"none"` included — a sortable
                    // column that drops the attribute when unsorted
                    // reads as not-sortable to a screen reader.
                    //
                    // AC4 also: Actions carries **no** `aria-sort`,
                    // because `aria-sort` on a column that cannot be
                    // sorted is a lie rather than a default. Gated on
                    // `getCanSort()`, not on the column id.
                    aria-sort={
                      sortable
                        ? sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : sortable ? (
                      <button
                        type="button"
                        className={styles["crm-sort-button"]}
                        aria-label={String(header.column.columnDef.header)}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <table.FlexRender header={header} />
                        <span
                          className={styles["crm-sort-caret"]}
                          aria-hidden="true"
                        >
                          {sorted === "asc"
                            ? "▲"
                            : sorted === "desc"
                              ? "▼"
                              : ""}
                        </span>
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
