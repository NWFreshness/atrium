"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CIRCLE_META, type CheckInStatus } from "@/lib/rolodex/constants";
import { deletePersonAction } from "@/lib/rolodex/person-actions";
import type { PersonComputed } from "@/lib/rolodex/queries";
import { Initials } from "./initials";
import { PersonForm } from "./person-form";
import styles from "./people.module.css";

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, PersonComputed>();

const STATUS_LABEL: Record<CheckInStatus, string> = {
  in_touch: "In touch",
  due_soon: "Due soon",
  overdue: "Overdue",
  snoozed: "Snoozed",
  off: "Off",
};

export function PeopleTable({ people }: { people: PersonComputed[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PersonComputed | null>(null);

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "initials",
          header: "",
          cell: ({ row }) => <Initials name={row.original.name} />,
        }),
        columnHelper.accessor("name", {
          header: "Name",
          cell: (info) => (
            <Link
              className={styles["rolodex-table-link"]}
              href={`/rolodex/people/${info.row.original.id}`}
            >
              {info.getValue()}
            </Link>
          ),
        }),
        columnHelper.accessor("company", {
          header: "Company",
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor("circle", {
          header: "Circle",
          cell: (info) => CIRCLE_META[info.getValue()].label,
        }),
        columnHelper.accessor("lastContacted", {
          header: "Last contacted",
          cell: (info) => info.getValue() ?? "",
        }),
        columnHelper.accessor((row) => row.latestNews?.text ?? "", {
          id: "latestNews",
          header: "Latest news",
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: (info) => {
            const status = info.getValue();
            return (
              <span
                className={`${styles["rolodex-status"]} ${styles[`rolodex-status-${status}`]}`}
              >
                {STATUS_LABEL[status]}
              </span>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: ({ row }) => {
            const person = row.original;
            return (
              <div className={styles["rolodex-row-actions"]}>
                <button
                  type="button"
                  aria-label={`Edit ${person.name}`}
                  onClick={() => setEditing(person)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${person.name}`}
                  onClick={async () => {
                    if (!confirm(`Delete ${person.name}?`)) {
                      return;
                    }
                    await deletePersonAction(person.id);
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
    data: people,
  });

  return (
    <>
      {people.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No people</p>
      ) : (
        <div className={styles["rolodex-table-wrap"]}>
          <table className={styles["rolodex-table"]}>
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
        <PersonForm person={editing} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}
