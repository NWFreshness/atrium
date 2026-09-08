"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteDealAction } from "@/lib/crm/deal-actions";
import { formatDate, formatMoney } from "@/lib/crm/format";
import type { Contact, Deal, Organization } from "@/lib/crm/queries";
import { DealForm } from "./deal-form";
import styles from "./org.module.css";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Deal>();

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

export function DealTable({
  deals,
  organizations,
  contacts,
}: {
  deals: Deal[];
  organizations: Organization[];
  contacts: Contact[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Deal | null>(null);
  const orgNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const organization of organizations) {
      map.set(organization.id, organization.name);
    }
    return map;
  }, [organizations]);
  const contactNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const contact of contacts) {
      map.set(contact.id, contact.name);
    }
    return map;
  }, [contacts]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => (
            <Link
              className={styles["crm-table-link"]}
              href={`/crm/deals/${info.row.original.id}`}
            >
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("stage", {
          header: "Stage",
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("value", {
          header: "Value",
          cell: (info) => formatMoney(info.getValue()),
        }),
        columnHelper.accessor("closeDate", {
          header: "Close date",
          cell: (info) => formatDate(asDate(info.getValue())),
        }),
        columnHelper.accessor("organizationId", {
          header: "Organization",
          cell: (info) => {
            const organizationId = info.getValue();
            if (!organizationId) {
              return "";
            }
            return orgNames.get(organizationId) ?? "";
          },
        }),
        columnHelper.accessor("contactId", {
          header: "Contact",
          cell: (info) => {
            const contactId = info.getValue();
            if (!contactId) {
              return "";
            }
            return contactNames.get(contactId) ?? "";
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const deal = row.original;
            return (
              <div className={styles["crm-row-actions"]}>
                <button
                  type="button"
                  aria-label={`Edit ${deal.name}`}
                  onClick={() => setEditing(deal)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${deal.name}`}
                  onClick={async () => {
                    if (!confirm(`Delete ${deal.name}?`)) {
                      return;
                    }
                    await deleteDealAction(deal.id);
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
    [contactNames, orgNames, router],
  );

  const table = useTable({
    features,
    columns,
    data: deals,
  });

  return (
    <>
      {deals.length === 0 ? (
        <p className={styles["crm-empty"]}>No deals</p>
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
        <DealForm
          deal={editing}
          organizations={organizations}
          contacts={contacts}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
