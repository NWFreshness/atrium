import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PERSON_FIELDS } from "./person-fields";

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8");

describe("PERSON_FIELDS", () => {
  it("is the eight fields, in the order the mapping select shows them", () => {
    expect(PERSON_FIELDS.map((field) => field.key)).toEqual([
      "name",
      "email",
      "phone",
      "jobTitle",
      "company",
      "city",
      "birthday",
      "notes",
    ]);
    expect(PERSON_FIELDS.map((field) => field.label)).toEqual([
      "Name",
      "Email",
      "Phone",
      "Job title",
      "Company",
      "City",
      "Birthday",
      "Notes",
    ]);
  });

  it("marks name as the one required field", () => {
    // The dialog's deleted copy is exactly where this flag had gone missing, so
    // it is asserted here rather than trusted to stay.
    const required = PERSON_FIELDS.filter(
      (field) => "required" in field && field.required,
    );
    expect(required.map((field) => field.key)).toEqual(["name"]);
  });

  it("carries no value import, so neither client nor server drags the other in", () => {
    // The strong form of "no papaparse, vcf, ./queries, ./schema or ../db":
    // this module is data. `import type` would be erased, and is allowed.
    const source = read("./person-fields.ts");
    const valueImports = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line))
      .filter((line) => !/^\s*import\s+type\b/.test(line));

    expect(valueImports).toEqual([]);
  });

  it("is the only definition — both consumers import it", () => {
    const parser = read("./import.ts");
    const dialog = read("../../components/rolodex/import-dialog.tsx");

    expect(parser).not.toMatch(/const\s+PERSON_FIELDS\s*=/);
    expect(parser).toContain("PERSON_FIELDS");
    expect(parser).toMatch(/from "\.\/person-fields"/);

    expect(dialog).not.toMatch(/const\s+PERSON_FIELDS\s*=/);
    expect(dialog).toMatch(/from "@\/lib\/rolodex\/person-fields"/);
    expect(dialog).toContain("PERSON_FIELDS.map(");
  });
});
