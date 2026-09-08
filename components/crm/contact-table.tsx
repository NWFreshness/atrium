"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { deleteContactAction } from "@/lib/crm/contact-actions";
import type { Contact, Organization } from "@/lib/crm/queries";
import { ContactForm } from "./contact-form";
import styles from "./org.module.css";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Contact>();

export function ContactTable({
  contacts,
  organizations,
}: {
  contacts: Contact[];
  organizations: Organization[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Contact | null>(null);
  const orgNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const organization of organizations) {
      map.set(organization.id, organization.name);
    }
    return map;
  }, [organizations]);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => (
            <Link
              className={styles["crm-table-link"]}
              href={`/crm/contacts/${info.row.original.id}`}
            >
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => info.getValue(),
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
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const contact = row.original;
            return (
              <div className={styles["crm-row-actions"]}>
                <button
                  type="button"
                  aria-label={`Edit ${contact.name}`}
                  onClick={() => setEditing(contact)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${contact.name}`}
                  onClick={async () => {
                    if (!confirm(`Delete ${contact.name}?`)) {
                      return;
                    }
                    await deleteContactAction(contact.id);
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
    [orgNames, router],
  );

  const table = useTable({
    features,
    columns,
    data: contacts,
  });

  return (
    <>
      {contacts.length === 0 ? (
        <p className={styles["crm-empty"]}>No contacts</p>
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
        <ContactForm
          contact={editing}
          organizations={organizations}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
