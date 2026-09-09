import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  applyImport,
  applyMapping,
  findDuplicates,
  parseCSV,
  parseVcf,
} from "./import";
import {
  createMemoryRolodexRepository,
  createPerson,
  listImportantDates,
  listPeople,
} from "./queries";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("parseCSV", () => {
  it("suggests a mapping from synonym headers", () => {
    const csv = readFileSync(join(fixtures, "people.csv"), "utf8");
    const parsed = parseCSV(csv);
    expect(parsed.suggestedMapping).toMatchObject({
      Name: "name",
      Email: "email",
      Company: "company",
      City: "city",
    });
    const { people, skipped } = applyMapping(parsed, parsed.suggestedMapping!);
    expect(skipped).toBe(0);
    expect(people.map((person) => person.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
    expect(people[0]?.email).toBe("ada@example.com");
  });

  it("keeps missing ragged cells as undefined, not empty strings", () => {
    const csv = readFileSync(join(fixtures, "ragged.csv"), "utf8");
    const parsed = parseCSV(csv);
    expect(parsed.rows[0]?.Phone).toBeUndefined();
    const { people } = applyMapping(parsed, parsed.suggestedMapping!);
    expect(people[0]?.phone).toBeNull();
    expect(people[0]?.name).toBe("Ragged Only");
  });

  it("skips rows without a name", () => {
    const parsed = parseCSV("Email\nada@example.com\n");
    const { people, skipped } = applyMapping(parsed, { Email: "email" });
    expect(people).toEqual([]);
    expect(skipped).toBe(1);
  });
});

describe("parseVcf", () => {
  it("parses people from a vCard file", () => {
    const vcf = readFileSync(join(fixtures, "people.vcf"), "utf8");
    const people = parseVcf(vcf);
    expect(people.map((person) => person.name)).toEqual([
      "Ada Lovelace",
      "Charles Babbage",
    ]);
    expect(people[0]?.company).toBe("Analytical Engines");
    expect(people[0]?.city).toBe("London");
    expect(people[0]?.jobTitle).toBe("Mathematician");
  });

  it("returns nobody for unreadable vCard text", () => {
    expect(parseVcf("not a card")).toEqual([]);
  });
});

describe("findDuplicates", () => {
  const existing = [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
  ];

  it("flags email first, then name", () => {
    expect(
      findDuplicates(
        {
          name: "Someone Else",
          email: "ADA@example.com",
          phone: null,
          jobTitle: null,
          company: null,
          city: null,
          birthday: null,
          notes: null,
        },
        existing,
      ).reason,
    ).toBe("email");
    expect(
      findDuplicates(
        {
          name: "Ada Lovelace",
          email: null,
          phone: null,
          jobTitle: null,
          company: null,
          city: null,
          birthday: null,
          notes: null,
        },
        existing,
      ).reason,
    ).toBe("name");
  });
});

describe("applyImport", () => {
  it("imports people and birthday into the session tenant only", async () => {
    const repo = createMemoryRolodexRepository();
    await createPerson(tenantB(), { name: "Owner Person" }, repo);
    const result = await applyImport(
      tenantA(),
      [
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          jobTitle: null,
          company: "Analytical Engines",
          city: "London",
          birthday: "1815-12-10",
          notes: null,
        },
      ],
      repo,
    );
    expect(result.imported).toBe(1);
    expect((await listPeople(tenantA(), repo)).map((row) => row.name)).toEqual([
      "Ada Lovelace",
    ]);
    expect((await listPeople(tenantB(), repo)).map((row) => row.name)).toEqual([
      "Owner Person",
    ]);
    const dates = await listImportantDates(tenantA(), repo);
    expect(dates[0]).toMatchObject({
      type: "birthday",
      month: 12,
      day: 10,
      year: 1815,
    });
  });

  it("does not create a second copy of a duplicate", async () => {
    const repo = createMemoryRolodexRepository();
    await createPerson(
      tenantA(),
      { name: "Ada Lovelace", email: "ada@example.com" },
      repo,
    );
    const result = await applyImport(
      tenantA(),
      [
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          phone: null,
          jobTitle: null,
          company: null,
          city: null,
          birthday: null,
          notes: null,
        },
      ],
      repo,
    );
    expect(result.imported).toBe(0);
    expect(result.skippedDuplicate).toBe(1);
    expect(await listPeople(tenantA(), repo)).toHaveLength(1);
  });

  it("rolls back the memory repo when apply throws", async () => {
    const repo = createMemoryRolodexRepository();
    const push = repo.people.push.bind(repo.people);
    let count = 0;
    repo.people.push = ((...args: Parameters<typeof push>) => {
      count += 1;
      if (count > 1) {
        throw new Error("boom");
      }
      return push(...args);
    }) as typeof repo.people.push;

    await expect(
      applyImport(
        tenantA(),
        [
          {
            name: "One",
            email: "one@example.com",
            phone: null,
            jobTitle: null,
            company: null,
            city: null,
            birthday: null,
            notes: null,
          },
          {
            name: "Two",
            email: "two@example.com",
            phone: null,
            jobTitle: null,
            company: null,
            city: null,
            birthday: null,
            notes: null,
          },
        ],
        repo,
      ),
    ).rejects.toThrow("boom");
    expect(repo.people).toHaveLength(0);
  });
});

function tenantA() {
  return "tenant-a";
}

function tenantB() {
  return "tenant-b";
}
