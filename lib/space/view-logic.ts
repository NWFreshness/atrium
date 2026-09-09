import type { PropertyType } from "./constants";

export const TITLE_ID = "__title";

export type Filter = {
  propertyId: string;
  operator: string;
  value?: unknown;
};

export type ViewSort = {
  propertyId: string;
  direction: "asc" | "desc";
};

export type ViewConfig = {
  filters: Filter[];
  sort: ViewSort | null;
  groupPropertyId: string | null;
};

export type ViewRow = {
  id: string;
  title: string;
  values: Record<string, unknown>;
};

export type ViewOption = {
  id: string;
  name: string;
};

export type ViewProperty = {
  id: string;
  name?: string;
  type: PropertyType | "title";
  options: ViewOption[];
};

export type OperatorDef = {
  op: string;
  label: string;
  needsValue: boolean;
};

export type BoardColumn = {
  option: ViewOption | null;
  rows: ViewRow[];
};

export function operatorsFor(type: PropertyType | "title"): OperatorDef[] {
  switch (type) {
    case "title":
    case "text":
    case "url":
      return [
        { op: "contains", label: "contains", needsValue: true },
        { op: "not_contains", label: "does not contain", needsValue: true },
      ];
    case "number":
      return [
        { op: "eq", label: "=", needsValue: true },
        { op: "gt", label: ">", needsValue: true },
        { op: "lt", label: "<", needsValue: true },
      ];
    case "select":
      return [
        { op: "is", label: "is", needsValue: true },
        { op: "is_not", label: "is not", needsValue: true },
      ];
    case "multi_select":
      return [{ op: "has", label: "contains", needsValue: true }];
    case "date":
      return [
        { op: "before", label: "is before", needsValue: true },
        { op: "after", label: "is after", needsValue: true },
      ];
    case "checkbox":
      return [
        { op: "checked", label: "is checked", needsValue: false },
        { op: "unchecked", label: "is unchecked", needsValue: false },
      ];
  }
}

function valueText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(valueText).join(", ");
  return "";
}

function rowValue(row: ViewRow, propertyId: string): unknown {
  return propertyId === TITLE_ID ? row.title : row.values[propertyId];
}

const contains = (value: unknown, target: unknown) =>
  typeof target === "string" &&
  valueText(value).toLowerCase().includes(target.toLowerCase());

const isDate = (value: unknown): value is string =>
  typeof value === "string" && value !== "";

const OPERATORS = new Map<string, (value: unknown, target: unknown) => boolean>(
  [
    ["contains", contains],
    ["not_contains", (value, target) => !contains(value, target)],
    [
      "eq",
      (value, target) => typeof value === "number" && value === Number(target),
    ],
    [
      "gt",
      (value, target) => typeof value === "number" && value > Number(target),
    ],
    [
      "lt",
      (value, target) => typeof value === "number" && value < Number(target),
    ],
    ["is", (value, target) => value === target],
    ["is_not", (value, target) => value !== target],
    ["has", (value, target) => Array.isArray(value) && value.includes(target)],
    [
      "before",
      (value, target) =>
        isDate(value) && typeof target === "string" && value < target,
    ],
    [
      "after",
      (value, target) =>
        isDate(value) && typeof target === "string" && value > target,
    ],
    ["checked", (value) => Boolean(value)],
    ["unchecked", (value) => !value],
  ],
);

export function matchesFilter(
  row: ViewRow,
  filter: Filter,
  properties: ViewProperty[],
): boolean {
  if (
    filter.propertyId !== TITLE_ID &&
    !properties.some((property) => property.id === filter.propertyId)
  ) {
    return true;
  }
  const predicate = OPERATORS.get(filter.operator);
  if (!predicate) return true;
  return predicate(rowValue(row, filter.propertyId), filter.value);
}

export function applyFilters(
  rows: ViewRow[],
  filters: Filter[],
  properties: ViewProperty[],
): ViewRow[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) =>
    filters.every((filter) => matchesFilter(row, filter, properties)),
  );
}

function sortKey(
  row: ViewRow,
  propertyId: string,
  properties: ViewProperty[],
): string | number {
  const value = rowValue(row, propertyId);
  const prop = properties.find((property) => property.id === propertyId);
  if (value == null) {
    return prop?.type === "number" ? Number.NEGATIVE_INFINITY : "";
  }
  switch (prop?.type) {
    case "number":
      return typeof value === "number" ? value : Number.NEGATIVE_INFINITY;
    case "checkbox":
      return value === true ? 1 : 0;
    case "select": {
      const option = prop.options.find((item) => item.id === value);
      return (option?.name ?? "").toLowerCase();
    }
    case "multi_select": {
      if (!Array.isArray(value)) return "";
      const names = value
        .map((id) => prop.options.find((item) => item.id === id)?.name ?? "")
        .filter(Boolean)
        .map((name) => name.toLowerCase());
      return [...names].sort((a, b) => a.localeCompare(b)).join(",");
    }
    default:
      return valueText(value).toLowerCase();
  }
}

export function applySort(
  rows: ViewRow[],
  sort: ViewSort | null,
  properties: ViewProperty[],
): ViewRow[] {
  if (!sort) return rows;
  const dir = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const ka = sortKey(a, sort.propertyId, properties);
    const kb = sortKey(b, sort.propertyId, properties);
    if (ka < kb) return -dir;
    if (ka > kb) return dir;
    return 0;
  });
}

export function groupRows(
  rows: ViewRow[],
  groupProperty: ViewProperty,
): BoardColumn[] {
  const columns: BoardColumn[] = [{ option: null, rows: [] }];
  for (const option of groupProperty.options) {
    columns.push({ option, rows: [] });
  }
  for (const row of rows) {
    const value = row.values[groupProperty.id];
    const column =
      columns.find((item) => item.option?.id === value) ?? columns[0]!;
    column.rows.push(row);
  }
  return columns;
}

function isFilter(value: unknown): value is Filter {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return typeof raw.propertyId === "string" && typeof raw.operator === "string";
}

function isSort(value: unknown): value is ViewSort {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.propertyId === "string" &&
    (raw.direction === "asc" || raw.direction === "desc")
  );
}

export function parseViewConfig(config: unknown): ViewConfig {
  const raw =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};
  return {
    filters: Array.isArray(raw.filters) ? raw.filters.filter(isFilter) : [],
    sort: isSort(raw.sort) ? raw.sort : null,
    groupPropertyId:
      typeof raw.groupPropertyId === "string" ? raw.groupPropertyId : null,
  };
}

export function rowsFromSnapshot(snapshot: {
  rows: { id: string; title: string }[];
  values: { rowId: string; propertyId: string; value: unknown }[];
}): ViewRow[] {
  return snapshot.rows.map((row) => ({
    id: row.id,
    title: row.title,
    values: Object.fromEntries(
      snapshot.values
        .filter((value) => value.rowId === row.id)
        .map((value) => [value.propertyId, value.value]),
    ),
  }));
}
