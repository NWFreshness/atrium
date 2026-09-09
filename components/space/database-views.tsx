"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseTable } from "@/components/space/database-table";
import type { ViewKind } from "@/lib/space/constants";
import type { DatabaseSnapshot } from "@/lib/space/database-actions";
import { upsertViewAction } from "@/lib/space/view-actions";
import {
  applyFilters,
  applySort,
  operatorsFor,
  parseViewConfig,
  rowsFromSnapshot,
  TITLE_ID,
  type Filter,
  type ViewConfig,
  type ViewProperty,
  type ViewSort,
} from "@/lib/space/view-logic";
import { BoardView } from "./board-view";
import { ListView } from "./list-view";
import { ViewSwitcher } from "./view-switcher";
import styles from "./database-views.module.css";

function isViewKind(value: string | undefined): value is ViewKind {
  return value === "table" || value === "board" || value === "list";
}

function resolveKind(viewParam: string | undefined): ViewKind {
  return isViewKind(viewParam) ? viewParam : "table";
}

function viewProperties(snapshot: DatabaseSnapshot): ViewProperty[] {
  return snapshot.properties.map((property) => ({
    id: property.id,
    name: property.name,
    type: property.type,
    options: snapshot.options
      .filter((option) => option.propertyId === property.id)
      .slice()
      .sort((left, right) => left.position - right.position)
      .map((option) => ({ id: option.id, name: option.name })),
  }));
}

function cloneFilteredSnapshot(
  snapshot: DatabaseSnapshot,
  visible: { id: string }[],
): DatabaseSnapshot {
  const order = new Map(visible.map((row, index) => [row.id, index]));
  const rows = snapshot.rows
    .filter((row) => order.has(row.id))
    .sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    );
  const ids = new Set(rows.map((row) => row.id));
  return {
    ...snapshot,
    rows,
    values: snapshot.values.filter((value) => ids.has(value.rowId)),
  };
}

function filterLabel(filter: Filter, properties: ViewProperty[]): string {
  const property =
    filter.propertyId === TITLE_ID
      ? { name: "Name" }
      : properties.find((item) => item.id === filter.propertyId);
  const name = property?.name ?? filter.propertyId;
  if (filter.value == null || filter.value === "") {
    return `${name} ${filter.operator}`;
  }
  return `${name} ${filter.operator} ${String(filter.value)}`;
}

export function DatabaseViews({
  snapshot,
  viewParam,
}: {
  snapshot: DatabaseSnapshot;
  viewParam?: string;
}) {
  const router = useRouter();
  const kind = resolveKind(viewParam);
  const properties = useMemo(() => viewProperties(snapshot), [snapshot]);
  const config = parseViewConfig(
    snapshot.views.find((view) => view.kind === kind)?.config,
  );
  const rows = applySort(
    applyFilters(rowsFromSnapshot(snapshot), config.filters, properties),
    config.sort,
    properties,
  );
  const filteredSnapshot = cloneFilteredSnapshot(snapshot, rows);
  const selectProperties = properties.filter(
    (property) => property.type === "select",
  );
  const groupProperty =
    selectProperties.find(
      (property) => property.id === config.groupPropertyId,
    ) ?? selectProperties[0];
  const filterFields: ViewProperty[] = [
    { id: TITLE_ID, name: "Name", type: "title", options: [] },
    ...properties,
  ];
  const [draftPropertyId, setDraftPropertyId] = useState(
    filterFields[0]?.id ?? TITLE_ID,
  );
  const draftProperty =
    filterFields.find((property) => property.id === draftPropertyId) ??
    filterFields[0];
  const draftOps = draftProperty ? operatorsFor(draftProperty.type) : [];
  const [draftOperator, setDraftOperator] = useState(
    draftOps[0]?.op ?? "contains",
  );
  const [draftValue, setDraftValue] = useState("");
  const ops = operatorsFor(draftProperty?.type ?? "text").some(
    (item) => item.op === draftOperator,
  )
    ? operatorsFor(draftProperty?.type ?? "text")
    : draftOps;
  const activeOp = ops.find((item) => item.op === draftOperator) ?? ops[0];

  function persist(next: ViewConfig) {
    void upsertViewAction({
      databaseId: snapshot.database.id,
      kind,
      config: next,
    }).then(() => router.refresh());
  }

  function onKindChange(next: ViewKind) {
    router.push(`/space/${snapshot.database.id}?view=${next}`);
  }

  function addFilter() {
    if (!draftProperty || !activeOp) {
      return;
    }
    const filter: Filter = {
      propertyId: draftProperty.id,
      operator: activeOp.op,
    };
    if (activeOp.needsValue) {
      if (draftValue === "") {
        return;
      }
      filter.value =
        draftProperty.type === "number" ? Number(draftValue) : draftValue;
    }
    persist({ ...config, filters: [...config.filters, filter] });
    setDraftValue("");
  }

  function removeFilter(index: number) {
    persist({
      ...config,
      filters: config.filters.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function changeSort(
    propertyId: string,
    direction: ViewSort["direction"] | "",
  ) {
    persist({
      ...config,
      sort:
        propertyId === ""
          ? null
          : { propertyId, direction: direction === "desc" ? "desc" : "asc" },
    });
  }

  return (
    <div className={styles["space-views"]}>
      <div className={styles["space-view-toolbar"]}>
        <ViewSwitcher current={kind} onChange={onKindChange} />
        <form
          className={styles["space-view-form"]}
          onSubmit={(event) => {
            event.preventDefault();
            addFilter();
          }}
        >
          <select
            aria-label="Filter property"
            value={draftProperty?.id ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              setDraftPropertyId(nextId);
              const next = filterFields.find(
                (property) => property.id === nextId,
              );
              const nextOps = next ? operatorsFor(next.type) : [];
              setDraftOperator(nextOps[0]?.op ?? "contains");
              setDraftValue("");
            }}
          >
            {filterFields.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter operator"
            value={activeOp?.op ?? ""}
            onChange={(event) => setDraftOperator(event.target.value)}
          >
            {ops.map((item) => (
              <option key={item.op} value={item.op}>
                {item.label}
              </option>
            ))}
          </select>
          {activeOp?.needsValue ? (
            draftProperty?.type === "select" ||
            draftProperty?.type === "multi_select" ? (
              <select
                aria-label="Filter value"
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
              >
                <option value="">Select</option>
                {draftProperty.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Filter value"
                type={
                  draftProperty?.type === "date"
                    ? "date"
                    : draftProperty?.type === "number"
                      ? "number"
                      : "text"
                }
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
              />
            )
          ) : null}
          <button type="submit">Add filter</button>
        </form>
        <form className={styles["space-view-form"]}>
          <select
            aria-label="Sort property"
            value={config.sort?.propertyId ?? ""}
            onChange={(event) =>
              changeSort(event.target.value, config.sort?.direction ?? "asc")
            }
          >
            <option value="">No sort</option>
            <option value={TITLE_ID}>Name</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort direction"
            value={config.sort?.direction ?? "asc"}
            onChange={(event) =>
              changeSort(
                config.sort?.propertyId ?? TITLE_ID,
                event.target.value === "desc" ? "desc" : "asc",
              )
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </form>
        {kind === "board" && selectProperties.length > 0 ? (
          <form className={styles["space-view-form"]}>
            <select
              aria-label="Group by"
              value={groupProperty?.id ?? ""}
              onChange={(event) =>
                persist({
                  ...config,
                  groupPropertyId: event.target.value || null,
                })
              }
            >
              {selectProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </form>
        ) : null}
      </div>
      {config.filters.length > 0 ? (
        <ul className={styles["space-filter-list"]}>
          {config.filters.map((filter, index) => (
            <li key={`${filter.propertyId}-${filter.operator}-${index}`}>
              <span className={styles["space-filter-chip"]}>
                {filterLabel(filter, properties)}
                <button
                  type="button"
                  aria-label={`Remove filter ${filterLabel(filter, properties)}`}
                  onClick={() => removeFilter(index)}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {kind === "board" ? (
        groupProperty ? (
          <BoardView
            databaseId={snapshot.database.id}
            rows={rows}
            groupProperty={groupProperty}
            allRowIds={snapshot.rows.map((row) => row.id)}
          />
        ) : (
          <p className={styles["space-empty"]}>
            Add a select property to use the board.
          </p>
        )
      ) : kind === "list" ? (
        <ListView rows={rows} properties={properties} />
      ) : (
        <DatabaseTable snapshot={filteredSnapshot} />
      )}
    </div>
  );
}
