"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteOrganizationAction } from "@/lib/crm/org-actions";
import type { Organization } from "@/lib/crm/queries";
import { OrgForm } from "./org-form";
import styles from "./org.module.css";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Organization>();

export function OrgTable({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Organization | null>(null);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
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
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor("industry", {
          header: "Industry",
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
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
                    if (!confirm(`Delete ${org.name}?`)) {
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
  });

  return (
    <>
      {organizations.length === 0 ? (
        <p className={styles["crm-empty"]}>No organizations</p>
      ) : (
        <div className={styles["crm-table-wrap"]}>
          <table className={styles["crm-table"]}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  ))}
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
