import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "components/crm/org-table.tsx"),
  "utf8",
);

/**
 * Comments stripped, so every fence below asserts about **code**. Without
 * it, `not.toContain("accessorFn")` would be satisfied or broken by the
 * prose that documents the rule instead of by the rule itself — and this
 * repo's comments name the forbidden spellings on purpose.
 *
 * Block comments are cut whole. A line comment is cut only where `//` is not
 * preceded by `:`, so a `https://` inside a string survives.
 */
function code(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => {
      const at = line.indexOf("//");
      if (at === -1 || (at > 0 && line[at - 1] === ":")) {
        return line;
      }
      return line.slice(0, at);
    })
    .join("\n");
}

const codeOnly = code(source);

/**
 * The `<thead>` block. Header assertions are scoped here because the
 * row-action `<button>`s are declared *earlier* in the file than the header
 * markup, so a whole-file index comparison would compare the wrong two
 * positions and pass for the wrong reason.
 */
const thead = codeOnly.slice(
  codeOnly.indexOf("<thead>"),
  codeOnly.indexOf("</thead>"),
);

/**
 * 11.4 — the v9 sorting contract, fenced in source because `vitest` runs in
 * `environment: "node"` and these client components cannot be rendered here.
 * The behavioural half of this contract is `e2e/crm-deals.spec.ts`.
 */
describe("org-table", () => {
  it("uses @tanstack/react-table", () => {
    expect(source).toContain("@tanstack/react-table");
  });

  it("registers the sorting feature before its dependent row-model slot (AC1)", () => {
    expect(codeOnly).toContain("rowSortingFeature,");
    expect(codeOnly).toContain("sortedRowModel: createSortedRowModel()");
    // `tableFeatures` validates slot prerequisites in insertion order, so
    // the feature must precede the slot it gates. Dropping the feature while
    // keeping the slot is a type error — the card's injection probe #1.
    expect(codeOnly.indexOf("rowSortingFeature,")).toBeLessThan(
      codeOnly.indexOf("sortedRowModel: createSortedRowModel()"),
    );
    // The pre-11.4 empty registration, for the record.
    expect(codeOnly).not.toContain("tableFeatures({})");
  });

  it("carries no v8 sorting fossil (AC2)", () => {
    for (const fossil of [
      "onSortingChange",
      "useState<SortingState>",
      "sortingFn",
      "sortingFns",
      "getSortedRowModel",
    ]) {
      expect(codeOnly).not.toContain(fossil);
    }
    // `table.getSortedRowModel()` is a real v9 *method* sharing the v8
    // option's spelling. Zero occurrences is still the right rule: the
    // tables render `getRowModel()`, the end of the row-model pipeline, so a
    // later edit cannot reach into the sorted model and skip the stages after.
    expect(codeOnly).toContain("getRowModel()");
  });

  it("puts aria-sort on the th, never on the button (AC3, AC4)", () => {
    expect(thead).toContain('scope="col"');
    expect(thead).toContain("aria-sort={");
    // All three states are literal in the code, so `"none"` is a rendered
    // value rather than an omitted attribute.
    for (const state of ['"ascending"', '"descending"', '"none"']) {
      expect(thead).toContain(state);
    }
    // `aria-sort` opens the `<th>`, and the sort button follows it — it is
    // not one of the button's own attributes.
    expect(thead.indexOf("aria-sort={")).toBeLessThan(thead.indexOf("<button"));
    expect(thead).toContain("getToggleSortingHandler()");
    // The button's accessible name is the column label alone: the caret is
    // `aria-hidden`, so `getByRole("button", { name: "Name" })` matches
    // exactly rather than "Name ▲".
    expect(thead).toContain(
      'aria-label={String(header.column.columnDef.header)}',
    );
    expect(thead).toContain('aria-hidden="true"');
  });

  it("omits aria-sort on a column that cannot sort (AC4)", () => {
    // Gated on `getCanSort()` with an `undefined` fallthrough, not on the
    // Actions column's id: `aria-sort` on an unsortable column is a claim
    // the table cannot keep. Measured in Chromium before this gate existed —
    // Actions was rendering `aria-sort="none"`.
    expect(thead).toContain("sortable");
    expect(thead).toMatch(/aria-sort=\{\s*sortable/);
    expect(thead).toContain(": undefined");
  });

  it("keeps the Actions column unsortable (AC4)", () => {
    expect(codeOnly).toContain('id: "actions"');
    expect(codeOnly).toContain("enableSorting: false");
    // The header renders a button only when the column can sort, which is
    // how Actions ends up with neither a button nor a direction.
    expect(thead).toContain("getCanSort()");
  });

  it("sorts one column at a time (no multi-sort)", () => {
    expect(codeOnly).toContain("enableMultiSort: false");
  });

  it("leaves enableSortingRemoval at the removing default (AC3's third click)", () => {
    // v9 defaults `enableSortingRemoval` to true, and that default is what
    // makes the cycle asc -> desc -> none rather than asc <-> desc forever.
    // Asserting the absence documents that the default is relied on.
    expect(codeOnly).not.toContain("enableSortingRemoval");
  });

  it("keeps the empty-state branch first (AC7)", () => {
    expect(codeOnly).toContain("No organizations");
    expect(codeOnly.indexOf('className={styles["crm-empty"]}')).toBeLessThan(
      codeOnly.indexOf("<table"),
    );
  });

  it("keeps the Edit/Delete aria-labels byte-identical (AC8)", () => {
    expect(source).toContain("aria-label={`Edit ${org.name}`}");
    expect(source).toContain("aria-label={`Delete ${org.name}`}");
  });
});
