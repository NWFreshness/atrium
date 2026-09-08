"use client";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  createPropertyAction,
  createPropertyOptionAction,
  createRowAction,
  deletePropertyAction,
  deleteRowAction,
  renameRowAction,
  setRowValueAction,
  type DatabaseSnapshot,
} from "@/lib/space/database-actions";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/space/constants";
import type { Page, Property, PropertyOption } from "@/lib/space/queries";
import { OPTION_COLORS, optionColor, PropertyEditor } from "./property-editors";
import styles from "./database-table.module.css";

const features = tableFeatures({});

type TableRow = {
  page: Page;
};

function valueFor(
  snapshot: DatabaseSnapshot,
  rowId: string,
  propertyId: string,
): unknown {
  return (
    snapshot.values.find(
      (value) => value.rowId === rowId && value.propertyId === propertyId,
    )?.value ?? null
  );
}

export function DatabaseTable({ snapshot }: { snapshot: DatabaseSnapshot }) {
  const router = useRouter();
  const [propertyName, setPropertyName] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType>("text");
  const [optionName, setOptionName] = useState("");
  const [optionColorName, setOptionColorName] = useState("gray");
  const [optionPropertyId, setOptionPropertyId] = useState(
    snapshot.properties.find(
      (property) =>
        property.type === "select" || property.type === "multi_select",
    )?.id ?? "",
  );

  const selectProperties = snapshot.properties.filter(
    (property) =>
      property.type === "select" || property.type === "multi_select",
  );

  const columnHelper = useMemo(
    () => createColumnHelper<typeof features, TableRow>(),
    [],
  );

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.display({
          id: "title",
          header: "Name",
          cell: ({ row }) => {
            const page = row.original.page;
            return (
              <input
                className={styles["space-cell-input"]}
                aria-label={`Name ${page.title || "Untitled"}`}
                defaultValue={page.title}
                onBlur={(event) => {
                  void renameRowAction(page.id, event.target.value).then(() =>
                    router.refresh(),
                  );
                }}
              />
            );
          },
        }),
        ...snapshot.properties.map((property) =>
          columnHelper.display({
            id: property.id,
            header: () => (
              <span className={styles["space-prop-head"]}>
                {property.name}
                <button
                  type="button"
                  className={styles["space-icon-button"]}
                  aria-label={`Remove ${property.name}`}
                  onClick={() => {
                    if (!confirm(`Remove ${property.name}?`)) {
                      return;
                    }
                    void deletePropertyAction(property.id).then(() =>
                      router.refresh(),
                    );
                  }}
                >
                  ×
                </button>
              </span>
            ),
            cell: ({ row }) => (
              <PropertyEditor
                type={property.type}
                options={snapshot.options.filter(
                  (option) => option.propertyId === property.id,
                )}
                value={valueFor(snapshot, row.original.page.id, property.id)}
                ariaLabel={`${property.name} for ${row.original.page.title || "Untitled"}`}
                onChange={(value) => {
                  void setRowValueAction({
                    rowId: row.original.page.id,
                    propertyId: property.id,
                    value,
                  }).then(() => router.refresh());
                }}
              />
            ),
          }),
        ),
        columnHelper.display({
          id: "open",
          header: "",
          cell: ({ row }) => (
            <Link
              className={styles["space-row-link"]}
              href={`/space/${row.original.page.id}`}
            >
              Open
            </Link>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <button
              type="button"
              aria-label={`Delete ${row.original.page.title || "Untitled"}`}
              onClick={() => {
                if (
                  !confirm(`Delete ${row.original.page.title || "Untitled"}?`)
                ) {
                  return;
                }
                void deleteRowAction(row.original.page.id).then(() =>
                  router.refresh(),
                );
              }}
            >
              Delete
            </button>
          ),
        }),
      ]),
    [columnHelper, router, snapshot],
  );

  const data = useMemo(
    () => snapshot.rows.map((page) => ({ page })),
    [snapshot.rows],
  );

  const table = useTable({
    features,
    columns,
    data,
  });

  return (
    <div className={styles["space-database"]}>
      <div className={styles["space-db-toolbar"]}>
        <button
          type="button"
          aria-label="Add row"
          onClick={() => {
            void createRowAction({ databaseId: snapshot.database.id }).then(
              () => router.refresh(),
            );
          }}
        >
          Add row
        </button>
        <form
          className={styles["space-db-form"]}
          onSubmit={(event) => {
            event.preventDefault();
            if (!propertyName.trim()) {
              return;
            }
            void createPropertyAction({
              databaseId: snapshot.database.id,
              name: propertyName.trim(),
              type: propertyType,
            }).then(() => {
              setPropertyName("");
              router.refresh();
            });
          }}
        >
          <input
            aria-label="Property name"
            placeholder="Property name"
            value={propertyName}
            onChange={(event) => setPropertyName(event.target.value)}
          />
          <select
            aria-label="Property type"
            value={propertyType}
            onChange={(event) =>
              setPropertyType(event.target.value as PropertyType)
            }
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button type="submit">Add property</button>
        </form>
        {selectProperties.length > 0 ? (
          <form
            className={styles["space-db-form"]}
            onSubmit={(event) => {
              event.preventDefault();
              const propertyId = optionPropertyId || selectProperties[0]?.id;
              if (!propertyId || !optionName.trim()) {
                return;
              }
              void createPropertyOptionAction({
                propertyId,
                name: optionName.trim(),
                color: optionColorName,
              }).then(() => {
                setOptionName("");
                router.refresh();
              });
            }}
          >
            <select
              aria-label="Option property"
              value={optionPropertyId || selectProperties[0]?.id}
              onChange={(event) => setOptionPropertyId(event.target.value)}
            >
              {selectProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Option name"
              placeholder="Option name"
              value={optionName}
              onChange={(event) => setOptionName(event.target.value)}
            />
            <select
              aria-label="Option color"
              value={optionColorName}
              onChange={(event) => setOptionColorName(event.target.value)}
            >
              {OPTION_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <button type="submit">Add option</button>
          </form>
        ) : null}
      </div>
      <div className={styles["space-option-legend"]}>
        {snapshot.options.map((option: PropertyOption) => (
          <span
            key={option.id}
            className={styles["space-legend-chip"]}
            style={{ borderColor: optionColor(option.color) }}
          >
            {option.name}
          </span>
        ))}
      </div>
      {snapshot.rows.length === 0 ? (
        <p className={styles["space-empty"]}>No rows</p>
      ) : (
        <div className={styles["space-table-wrap"]}>
          <table className={styles["space-table"]}>
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
    </div>
  );
}

export function RowProperties({
  snapshot,
  row,
}: {
  snapshot: DatabaseSnapshot;
  row: Page;
}) {
  const router = useRouter();
  return (
    <dl className={styles["space-row-props"]}>
      {snapshot.properties.map((property: Property) => (
        <div key={property.id} className={styles["space-row-prop"]}>
          <dt>{property.name}</dt>
          <dd>
            <PropertyEditor
              type={property.type}
              options={snapshot.options.filter(
                (option) => option.propertyId === property.id,
              )}
              value={valueFor(snapshot, row.id, property.id)}
              ariaLabel={property.name}
              onChange={(value) => {
                void setRowValueAction({
                  rowId: row.id,
                  propertyId: property.id,
                  value,
                }).then(() => router.refresh());
              }}
            />
          </dd>
        </div>
      ))}
    </dl>
  );
}
