import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "components/crm/deal-table.tsx"),
  "utf8",
);

/** See `org-table.test.ts` for why comments are stripped before asserting. */
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
const thead = codeOnly.slice(
  codeOnly.indexOf("<thead>"),
  codeOnly.indexOf("</thead>"),
);

/** See `org-table.test.ts` for why these are source greps. */
describe("deal-table", () => {
  it("uses @tanstack/react-table", () => {
    expect(source).toContain("@tanstack/react-table");
  });

  it("registers the sorting feature before its dependent row-model slot (AC1)", () => {
    expect(codeOnly.indexOf("rowSortingFeature,")).toBeLessThan(
      codeOnly.indexOf("sortedRowModel: createSortedRowModel()"),
    );
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
    expect(codeOnly).toContain("getRowModel()");
  });

  it("starts Value and Close date descending, everything else ascending (AC3)", () => {
    // Two `sortDescFirst: true` in one file: Value and Close date only. A
    // third would mean a text column had picked up the wrong first
    // direction, which is what AC3 pins per column.
    expect(codeOnly.match(/sortDescFirst: true/g)?.length).toBe(2);
    // The removal default is relied on, not configured: v9 defaults
    // `enableSortingRemoval` to true, and that default is what makes the
    // third click return to server order.
    expect(codeOnly).not.toContain("enableSortingRemoval");
  });

  it("resolves org and contact names inside their comparators (AC6)", () => {
    expect(codeOnly).toContain('columnHelper.accessor("organizationId"');
    expect(codeOnly).toContain('columnHelper.accessor("contactId"');
    expect(codeOnly).not.toContain("accessorFn");
    expect(codeOnly).toContain("constructSortFn");
    expect(codeOnly).toContain("resolveDataValue");
    expect(codeOnly).toContain("sortFn: sortByName(orgNames)");
    expect(codeOnly).toContain("sortFn: sortByName(contactNames)");
    // Both maps stay in the dependency array.
    expect(codeOnly).toContain("[contactNames, orgNames, router]");
  });

  it("parks blank close dates last (AC3's recorded limit)", () => {
    // `closeDate` is `null` in the row type and v9's `sortUndefined` tests
    // `=== void 0`, so without this a blank date sorts as epoch 1970.
    expect(codeOnly).toContain('sortUndefined: "last"');
    expect(codeOnly).toContain("sortFn_datetime");
  });

  it("wraps every custom comparator in constructSortFn (AC3)", () => {
    // A bare `sortFn` is invoked as `(rowA, rowB, columnId)`, so an
    // unwrapped value comparator silently compares Rows and returns a
    // constant — the column renders unsorted while `aria-sort` claims
    // otherwise. This is the one defect in this feature that no source grep
    // alone can prove fixed, so it is both fenced here and caught by the
    // Playwright Value journey.
    expect(codeOnly).toContain("constructSortFn");
    // The numeric comparator's two literal sides, inside the constructor.
    expect(codeOnly).toMatch(
      /sortNumber = constructSortFn\(\{\s*sort: \(a, b\)/,
    );
    // `sortByName` spreads a built-in the same way.
    expect(codeOnly).toMatch(
      /function sortByName[\s\S]*?constructSortFn\(\{/,
    );
  });

  it("carries the aria-sort / Actions / empty contracts (AC4, AC7)", () => {
    expect(thead).toContain('scope="col"');
    expect(thead).toContain("aria-sort={");
    expect(thead).toMatch(/aria-sort=\{\s*sortable/);
    expect(thead).toContain("getCanSort()");
    expect(thead).toContain("getToggleSortingHandler()");
    expect(codeOnly).toContain('id: "actions"');
    expect(codeOnly).toContain("enableSorting: false");
    expect(codeOnly).toContain("enableMultiSort: false");
    expect(codeOnly).toContain("No deals");
    expect(codeOnly.indexOf('className={styles["crm-empty"]}')).toBeLessThan(
      codeOnly.indexOf("<table"),
    );
  });

  it("keeps the Edit/Delete aria-labels byte-identical (AC8)", () => {
    expect(source).toContain("aria-label={`Edit ${deal.name}`}");
    expect(source).toContain("aria-label={`Delete ${deal.name}`}");
  });
});
