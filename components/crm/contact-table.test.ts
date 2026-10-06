import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "components/crm/contact-table.tsx"),
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
describe("contact-table", () => {
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

  it("resolves the org name inside the comparator, never in an accessorFn (AC6)", () => {
    // The accessor is still the id — that is the whole point of AC6.
    expect(codeOnly).toContain('columnHelper.accessor("organizationId"');
    // A map-closing accessorFn would read `orgNames` during row creation,
    // which the memoized core row model can serve stale.
    expect(codeOnly).not.toContain("accessorFn");
    // The lookup happens in `resolveDataValue`, which runs at compare time,
    // so it always reads the map the columns were built with.
    expect(codeOnly).toContain("constructSortFn");
    expect(codeOnly).toContain("resolveDataValue");
    expect(codeOnly).toContain('names.get(String(value ?? "")) ?? ""');
    // Built inside the columns memo, so it cannot outlive the map it closes
    // over. 11.3 added `lastContactedByContactId` so the Last contacted
    // display column re-reads the derived per-contact values on every
    // re-render of the table.
    expect(codeOnly).toContain("sortFn: sortByOrgName(orgNames)");
    expect(codeOnly).toContain("[orgNames, router, lastContactedByContactId]");
  });

  it("carries the aria-sort / Actions contracts (AC3, AC4, AC7)", () => {
    expect(thead).toContain('scope="col"');
    expect(thead).toContain("aria-sort={");
    expect(thead).toMatch(/aria-sort=\{\s*sortable/);
    expect(thead).toContain("getCanSort()");
    expect(thead).toContain("getToggleSortingHandler()");
    expect(codeOnly).toContain('id: "actions"');
    expect(codeOnly).toContain("enableSorting: false");
    expect(codeOnly).toContain("enableMultiSort: false");
    expect(codeOnly).toContain("No contacts");
    expect(codeOnly.indexOf('className={styles["crm-empty"]}')).toBeLessThan(
      codeOnly.indexOf("<table"),
    );
  });

  it("keeps the Edit/Delete aria-labels byte-identical (AC8)", () => {
    expect(source).toContain("aria-label={`Edit ${contact.name}`}");
    expect(source).toContain("aria-label={`Delete ${contact.name}`}");
  });
});
