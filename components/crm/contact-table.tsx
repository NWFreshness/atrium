"use client";

import {
  constructSortFn,
  createColumnHelper,
  sortFn_alphanumeric,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  contactCascadePreviewAction,
  deleteContactAction,
} from "@/lib/crm/contact-actions";
import { formatDate } from "@/lib/crm/format";
import {
  daysSinceContacted,
  isStaleContacted,
  lastContactedAt,
} from "@/lib/crm/last-contacted";
import type { Activity, Contact, Organization } from "@/lib/crm/queries";
import { ContactForm } from "./contact-form";
import { CrmTable, features } from "./crm-table";
import styles from "./org.module.css";
import { useDeleteWithPreview } from "./use-delete-with-preview";

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

type ContactActivities = {
  activities: Activity[];
  lastContacted: Activity | null;
  isStale: boolean;
  daysSince: number | null;
};

/**
 * `Last contacted` is a `display` column with no `accessorFn`, so v9 TanStack
 * Table reports `column.getCanSort() === false` automatically — 11.4's
 * per-column sort pass is the right place to make it sortable, not here.
 */
function LastContactedCell({ data }: { data: ContactActivities | null }) {
  if (!data || !data.lastContacted) {
    return <span>Never</span>;
  }
  const label = formatDate(data.lastContacted.occurredAt);
  if (data.isStale && data.daysSince !== null) {
    return (
      <span className={styles["crm-stale"]}>
        {label} · {data.daysSince} days ago
      </span>
    );
  }
  return <span>{label}</span>;
}

export function ContactTable({
  contacts,
  organizations,
  activitiesByContactId = {},
  filtered = false,
}: {
  contacts: Contact[];
  organizations: Organization[];
  activitiesByContactId?: Record<string, Activity[]>;
  filtered?: boolean;
}) {
  const onDelete = useDeleteWithPreview(
    contactCascadePreviewAction,
    deleteContactAction,
  );
  const [editing, setEditing] = useState<Contact | null>(null);
  const orgNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const organization of organizations) {
      map.set(organization.id, organization.name);
    }
    return map;
  }, [organizations]);

  // Derived once per render of the columns. `lastContactedAt` and
  // `isStaleContacted` are pure helpers from `lib/crm/last-contacted.ts` and
  // can be called server- or client-side; the column is a `display` so the
  // values must be available before the cell renders, not from a memo
  // closure that the table could memoize around.
  const lastContactedByContactId = useMemo(() => {
    const map = new Map<string, ContactActivities>();
    for (const contact of contacts) {
      const activities = activitiesByContactId[contact.id] ?? [];
      const lastContacted = lastContactedAt(activities);
      const daysSince = daysSinceContacted(lastContacted?.occurredAt ?? null);
      const isStale = isStaleContacted(lastContacted?.occurredAt ?? null);
      map.set(contact.id, { activities, lastContacted, isStale, daysSince });
    }
    return map;
  }, [contacts, activitiesByContactId]);

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
        columnHelper.display({
          id: "last-contacted",
          header: "Last contacted",
          enableSorting: false,
          cell: ({ row }) => (
            <LastContactedCell
              data={lastContactedByContactId.get(row.original.id) ?? null}
            />
          ),
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
                  onClick={() => void onDelete(contact.id, contact.name)}
                >
                  Delete
                </button>
              </div>
            );
          },
        }),
      ]),
    [orgNames, onDelete, lastContactedByContactId],
  );

  const table = useTable({
    features,
    columns,
    data: contacts,
    enableMultiSort: false,
  });

  return (
    <>
      <CrmTable
        table={table}
        empty={filtered ? "No contacts match these filters." : "No contacts"}
      />
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
