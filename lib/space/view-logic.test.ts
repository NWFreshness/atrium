import { describe, expect, it } from "vitest";
import type { DatabaseSnapshot } from "./database-actions";
import {
  applyFilters,
  applySort,
  groupRows,
  matchesFilter,
  operatorsFor,
  parseViewConfig,
  rowsFromSnapshot,
  TITLE_ID,
  type ViewProperty,
  type ViewRow,
} from "./view-logic";

const props: ViewProperty[] = [
  { id: "author", name: "Author", type: "text", options: [] },
  {
    id: "status",
    name: "Status",
    type: "select",
    options: [
      { id: "toread", name: "To read" },
      { id: "reading", name: "Reading" },
    ],
  },
  {
    id: "genre",
    name: "Genre",
    type: "multi_select",
    options: [
      { id: "scifi", name: "Sci-fi" },
      { id: "classic", name: "Classic" },
    ],
  },
  { id: "rating", name: "Rating", type: "number", options: [] },
  { id: "done", name: "Done on", type: "date", options: [] },
  { id: "owned", name: "Owned", type: "checkbox", options: [] },
];

const row = (
  id: string,
  title: string,
  values: ViewRow["values"],
): ViewRow => ({
  id,
  title,
  values,
});

const rows: ViewRow[] = [
  row("r1", "Dune", {
    author: "Herbert",
    status: "reading",
    genre: ["scifi", "classic"],
    rating: 4.5,
    done: "2026-03-02",
    owned: true,
  }),
  row("r2", "Emma", {
    author: "Austen",
    status: "toread",
    genre: ["classic"],
    rating: 3,
    done: "2026-05-01",
    owned: false,
  }),
  row("r3", "Blindsight", {
    author: "Watts",
    genre: ["scifi"],
    rating: 5,
    owned: true,
  }),
];

describe("filters", () => {
  it("text contains and does not contain, case-insensitively", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "author", operator: "contains", value: "herb" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "author", operator: "not_contains", value: "a" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1"]);
  });

  it("filters on the title pseudo-property", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: TITLE_ID, operator: "contains", value: "em" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r2"]);
  });

  it("select is / is not", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "status", operator: "is", value: "reading" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "status", operator: "is_not", value: "reading" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r2", "r3"]);
  });

  it("multi-select contains", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "genre", operator: "has", value: "scifi" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1", "r3"]);
  });

  it("checkbox checked state", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "owned", operator: "checked" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1", "r3"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "owned", operator: "unchecked" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r2"]);
  });

  it("date before / after, ignoring empty dates", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "done", operator: "before", value: "2026-04-01" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "done", operator: "after", value: "2026-04-01" }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r2"]);
  });

  it("number comparisons", () => {
    expect(
      applyFilters(
        rows,
        [{ propertyId: "rating", operator: "gt", value: 4 }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r1", "r3"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "rating", operator: "lt", value: 4 }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r2"]);
    expect(
      applyFilters(
        rows,
        [{ propertyId: "rating", operator: "eq", value: 5 }],
        props,
      ).map((item) => item.id),
    ).toEqual(["r3"]);
  });

  it("combines multiple filters with AND", () => {
    const result = applyFilters(
      rows,
      [
        { propertyId: "genre", operator: "has", value: "scifi" },
        { propertyId: "owned", operator: "checked" },
        { propertyId: "rating", operator: "gt", value: 4.6 },
      ],
      props,
    );
    expect(result.map((item) => item.id)).toEqual(["r3"]);
  });

  it("unknown operator or deleted property matches everything", () => {
    expect(
      matchesFilter(
        rows[0]!,
        { propertyId: "author", operator: "mystery" },
        props,
      ),
    ).toBe(true);
    expect(
      matchesFilter(
        rows[0]!,
        { propertyId: "gone", operator: "is", value: "x" },
        props,
      ),
    ).toBe(true);
  });
});

describe("sort", () => {
  it("sorts text ascending and descending", () => {
    expect(
      applySort(rows, { propertyId: "author", direction: "asc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r2", "r1", "r3"]);
    expect(
      applySort(rows, { propertyId: "author", direction: "desc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r3", "r1", "r2"]);
  });

  it("sorts numbers with blanks last-ish and dates as strings", () => {
    expect(
      applySort(rows, { propertyId: "rating", direction: "desc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r3", "r1", "r2"]);
    expect(
      applySort(rows, { propertyId: "done", direction: "asc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r3", "r1", "r2"]);
  });

  it("sorts selects by option name and checkboxes by state", () => {
    expect(
      applySort(rows, { propertyId: "status", direction: "asc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r3", "r1", "r2"]);
    expect(
      applySort(rows, { propertyId: "owned", direction: "desc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r1", "r3", "r2"]);
  });

  it("sorts multi-select by option names", () => {
    expect(
      applySort(rows, { propertyId: "genre", direction: "asc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r2", "r1", "r3"]);
  });

  it("sorts by title and returns the input when sort is null", () => {
    expect(
      applySort(rows, { propertyId: TITLE_ID, direction: "asc" }, props).map(
        (item) => item.id,
      ),
    ).toEqual(["r3", "r1", "r2"]);
    expect(applySort(rows, null, props)).toBe(rows);
  });
});

describe("groupRows", () => {
  it("builds one column per option plus a none column first", () => {
    const statusProp = props.find((property) => property.id === "status")!;
    const columns = groupRows(rows, statusProp);
    expect(columns.map((column) => column.option?.name ?? "none")).toEqual([
      "none",
      "To read",
      "Reading",
    ]);
    expect(columns[0]!.rows.map((item) => item.id)).toEqual(["r3"]);
    expect(columns[1]!.rows.map((item) => item.id)).toEqual(["r2"]);
    expect(columns[2]!.rows.map((item) => item.id)).toEqual(["r1"]);
  });
});

describe("operatorsFor", () => {
  it("gives every type a sensible operator set", () => {
    expect(operatorsFor("text").map((item) => item.op)).toEqual([
      "contains",
      "not_contains",
    ]);
    expect(operatorsFor("url").map((item) => item.op)).toEqual([
      "contains",
      "not_contains",
    ]);
    expect(operatorsFor("title").map((item) => item.op)).toEqual([
      "contains",
      "not_contains",
    ]);
    expect(operatorsFor("select").map((item) => item.op)).toEqual([
      "is",
      "is_not",
    ]);
    expect(operatorsFor("checkbox").every((item) => !item.needsValue)).toBe(
      true,
    );
    expect(operatorsFor("date").map((item) => item.op)).toEqual([
      "before",
      "after",
    ]);
    expect(operatorsFor("number").map((item) => item.op)).toEqual([
      "eq",
      "gt",
      "lt",
    ]);
    expect(operatorsFor("multi_select").map((item) => item.op)).toEqual([
      "has",
    ]);
  });
});

describe("parseViewConfig", () => {
  it("defaults empty filters, null sort, and null group", () => {
    expect(parseViewConfig(undefined)).toEqual({
      filters: [],
      sort: null,
      groupPropertyId: null,
    });
    expect(parseViewConfig({})).toEqual({
      filters: [],
      sort: null,
      groupPropertyId: null,
    });
  });

  it("reads filters, sort, and grouping from jsonb", () => {
    expect(
      parseViewConfig({
        filters: [{ propertyId: "status", operator: "is", value: "planning" }],
        sort: { propertyId: "budget", direction: "desc" },
        groupPropertyId: "status",
      }),
    ).toEqual({
      filters: [{ propertyId: "status", operator: "is", value: "planning" }],
      sort: { propertyId: "budget", direction: "desc" },
      groupPropertyId: "status",
    });
  });
});

describe("rowsFromSnapshot", () => {
  it("joins snapshot rows with values by row id", () => {
    const snapshot = {
      rows: [
        { id: "r1", title: "Japan, ten days" },
        { id: "r2", title: "Lisbon long weekend" },
      ],
      values: [
        { rowId: "r1", propertyId: "status", value: "booked" },
        { rowId: "r1", propertyId: "budget", value: 4800 },
        { rowId: "r2", propertyId: "status", value: "planning" },
      ],
    } as Pick<DatabaseSnapshot, "rows" | "values">;

    expect(rowsFromSnapshot(snapshot)).toEqual([
      {
        id: "r1",
        title: "Japan, ten days",
        values: { status: "booked", budget: 4800 },
      },
      {
        id: "r2",
        title: "Lisbon long weekend",
        values: { status: "planning" },
      },
    ]);
  });
});
