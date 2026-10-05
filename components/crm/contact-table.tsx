"use client";

import {
  constructSortFn,
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
import { deleteContactAction } from "@/lib/crm/contact-actions";
import type { Contact, Organization } from "@/lib/crm/queries";
import { ContactForm } from "./contact-form";
import styles from "./org.module.css";

/** 11.4 — v9 sorting; see `org-table.tsx` for why the feature precedes its slot. */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof features, Contact>();

/**
 * The built-in text comparator, case-folded and natural-numeric. Pinned on
 * every text column instead of leaving it to `"auto"` — measured in v9.2.4,
 * auto picks a comparator by sampling the first ten rows, so an empty or
 * narrow page resolves a different one and the column's order changes with
 * the data. `org-table.tsx` has the longer note.
 */
const sortText = sortFn_alphanumeric;

/**
 * **The accessorFn trap, avoided** (spec §2).
 *
 * The accessor stays `organizationId`. The alternative — `accessorFn: (row)
 * => orgNames.get(row.organizationId ?? "")` — would sort by a name resolved
 * from a `useMemo` map, and TanStack memoizes its core row model on `data`
 * alone, so a changed map with unchanged `data` sorts stale names.
 *
 * Instead the comparator resolves the id to its visible name at compare
 * time. `resolveDataValue` is the v9 seam for that: it runs on both sides
 * immediately before the comparison, inside the sort, so it always reads the
 * map captured when the columns were built. It is only consulted by
 * `constructSortFn`-built comparators, which every built-in is.
 *
 * The comparator is the built-in's, unchanged: it still returns ascending
 * only, because the sorted row model applies `desc` itself.
 *
 * A function, not a module constant, because the map is per-component state.
 * Called from inside the `columns` `useMemo` so the comparator is rebuilt
 * with the map and can never outlive it.
 */
function sortByOrgName(names: Map<string, string>) {
  return constructSortFn({
    ...sortFn_alphanumeric,
    resolveDataValue: (value) => names.get(String(value ?? "")) ?? "",
  });
}

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
          sortFn: sortText,
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
          sortFn: sortText,
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor("status", {
          header: "Status",
          sortFn: sortText,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("organizationId", {
          header: "Organization",
          sortFn: sortByOrgName(orgNames),
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
          enableSorting: false,
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
    enableMultiSort: false,
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
                  {headerGroup.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const sortable = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        // See `org-table.tsx`: `aria-sort` lives on the cell,
                        // is always one of the three values on a sortable
                        // column, and is absent on one that cannot sort.
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
        <ContactForm
          contact={editing}
          organizations={organizations}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
