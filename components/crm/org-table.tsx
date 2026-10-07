"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  deleteOrganizationAction,
  organizationCascadePreviewAction,
} from "@/lib/crm/org-actions";
import { consequenceMessage } from "@/lib/crm/cascade-preview";
import type { Organization } from "@/lib/crm/queries";
import { OrgForm } from "./org-form";
import styles from "./org.module.css";

/**
 * 11.4 — v9 sorting. `rowSortingFeature` must be registered **before** its
 * dependent `sortedRowModel` slot; dropping it while keeping the slot is a
 * type error (`ValidateFeatureSlots`), which is the card's injection probe #1.
 *
 * `enableMultiSort: false` is deliberate: the spec asks for one sortable
 * column at a time, and v9's default is multi-sort on. Left as a table option
 * rather than a per-column `enableMultiSort` so it reads as the product rule.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof features, Organization>();

/**
 * `sortFn_alphanumeric` rather than `"auto"`: the auto resolver samples rows
 * and picks a built-in per column, so the same column can order
 * `Beta < alpha` on one page and `alpha < Beta` on the next. Measured in
 * v9.2.4: auto over `["Zeta","alpha beta","Alpha","10 x","2 x"]` returns
 * `10 x, 2 x, Alpha, Zeta, alpha beta` — case-folded and natural-numeric.
 * Pinning the comparator makes the order a property of the code, not of
 * whichever rows happened to load first.
 */
const sortText = sortFn_alphanumeric;

export function OrgTable({
  organizations,
  filtered = false,
}: {
  organizations: Organization[];
  filtered?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Organization | null>(null);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
          sortFn: sortText,
          cell: (info) => (
            <Link
              className={styles["crm-table-link"]}
              href={`/crm/organizations/${info.row.original.id}`}
            >
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("website", {
          header: "Website",
          sortFn: sortText,
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor("industry", {
          header: "Industry",
          sortFn: sortText,
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          // Not sortable: it holds buttons, not a value, and a display
          // column has no accessorFn — `getCanSort()` is already false
          // (measured: `column_getCanSort` requires `!!column.accessorFn`).
          // Stated explicitly so the "Actions has no `aria-sort`" contract
          // does not depend on that implementation detail.
          enableSorting: false,
          cell: ({ row }) => {
            const org = row.original;
            return (
              <div className={styles["crm-row-actions"]}>
                <button
                  type="button"
                  aria-label={`Edit ${org.name}`}
                  onClick={() => setEditing(org)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${org.name}`}
                  onClick={async () => {
                    const preview =
                      await organizationCascadePreviewAction(org.id);
                    if (!confirm(consequenceMessage(org.name, preview))) {
                      return;
                    }
                    await deleteOrganizationAction(org.id);
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              </div>
            );
          },
        }),
      ]),
    [router],
  );

  const table = useTable({
    features,
    columns,
    data: organizations,
    enableMultiSort: false,
  });

  return (
    <>
      {organizations.length === 0 ? (
        <p className={styles["crm-empty"]}>
          {filtered ? "No organizations match these filters." : "No organizations"}
        </p>
      ) : (
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
      )}
      {editing ? (
        <OrgForm organization={editing} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}
