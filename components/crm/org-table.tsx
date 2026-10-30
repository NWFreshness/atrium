"use client";

import {
  createColumnHelper,
  sortFn_alphanumeric,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  deleteOrganizationAction,
  organizationCascadePreviewAction,
} from "@/lib/crm/org-actions";
import type { Organization } from "@/lib/crm/queries";
import { OrgForm } from "./org-form";
import { CrmTable, features } from "./crm-table";
import styles from "./org.module.css";
import { useDeleteWithPreview } from "./use-delete-with-preview";

/**
 * `enableMultiSort: false` (below) is deliberate: the spec asks for one
 * sortable column at a time, and v9's default is multi-sort on. Left as a
 * table option rather than a per-column `enableMultiSort` so it reads as the
 * product rule.
 */
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
  const onDelete = useDeleteWithPreview(
    organizationCascadePreviewAction,
    deleteOrganizationAction,
  );
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
                  onClick={() => void onDelete(org.id, org.name)}
                >
                  Delete
                </button>
              </div>
            );
          },
        }),
      ]),
    [onDelete],
  );

  const table = useTable({
    features,
    columns,
    data: organizations,
    enableMultiSort: false,
  });

  return (
    <>
      <CrmTable
        table={table}
        empty={
          filtered
            ? "No organizations match these filters."
            : "No organizations"
        }
      />
      {editing ? (
        <OrgForm organization={editing} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}
