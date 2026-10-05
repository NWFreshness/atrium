"use client";

import {
  constructSortFn,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
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

/** 11.4 — v9 sorting; see `org-table.tsx` for why the feature precedes its slot. */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});
const columnHelper = createColumnHelper<typeof features, Deal>();

const sortText = sortFn_alphanumeric;

/**
 * Value is `doublePrecision` in Postgres and `number` in the row.
 *
 * Built with `constructSortFn`, and that is not decoration: a **bare**
 * function passed as `sortFn` is called as `(rowA, rowB, columnId)`, so a
 * value-level comparator handed over unwrapped receives two Row objects,
 * `Number(row)` is `NaN`, `NaN === NaN` is false, and every pair compares as
 * `-1` — the column looks sorted and is not. Measured: with the bare form,
 * `18000 / 5000 / 120000` came back unsorted; wrapped, descending gives
 * `120000 / 18000 / 5000`.
 *
 * The Playwright Value journey is what caught it — it is the only assertion
 * in the suite that reads numbers back out of a sorted column.
 *
 * Ascending only; the sorted row model applies `desc` itself.
 */
const sortNumber = constructSortFn({
  sort: (a, b) => (Number(a) === Number(b) ? 0 : Number(a) > Number(b) ? 1 : -1),
});

/**
 * Resolving a name from a map **inside** the comparator, never in an
 * `accessorFn`. See the full note on `sortByOrgName` in `contact-table.tsx`:
 * the accessor stays the id, the map lookup happens at compare time, and the
 * comparator still returns ascending only.
 */
function sortByName(names: Map<string, string>) {
  return constructSortFn({
    ...sortFn_alphanumeric,
    resolveDataValue: (value) => names.get(String(value ?? "")) ?? "",
  });
}

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
          sortFn: sortText,
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
          sortFn: sortText,
          cell: (info) => info.getValue(),
        }),
        columnHelper.accessor("value", {
          header: "Value",
          // Descending first: the question the column answers is "which
          // deals are biggest", and requiring two clicks to reach it would
          // make the most-used sort the least convenient one.
          sortDescFirst: true,
          sortFn: sortNumber,
          cell: (info) => formatMoney(info.getValue()),
        }),
        columnHelper.accessor("closeDate", {
          header: "Close date",
          // Descending first, same reasoning: latest close date first.
          //
          // `sortUndefined: "last"` parks blanks at the bottom in **both**
          // directions. CRM stores `closeDate` as `null` (`schema.ts:81`),
          // and v9's `sortUndefined` tests `=== void 0` only — so the
          // optional never fires on a `null` and blanks would otherwise sort
          // as epoch 1970. Measured: with `sortUndefined: "last"` ascending
          // yields `null, Jan 14, Feb 28` and descending `Feb 28, Jan 14,
          // null` — blanks last both ways. (The spec's `?? undefined`
          // suggestion would work only if the accessor changed, and changing
          // it would change the cell's `null` contract too.)
          sortDescFirst: true,
          sortUndefined: "last",
          sortFn: sortFn_datetime,
          cell: (info) => formatDate(asDate(info.getValue())),
        }),
        columnHelper.accessor("organizationId", {
          header: "Organization",
          sortFn: sortByName(orgNames),
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
          sortFn: sortByName(contactNames),
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
          enableSorting: false,
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
    enableMultiSort: false,
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
