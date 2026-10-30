import { describe, expect, it } from "vitest";
import { MAX_LONG_TEXT, MAX_SHORT_TEXT } from "../input/text";
import type { Person } from "./queries";
import { people } from "./schema";
import { rolodexSeedRows } from "./seed";
import { CIRCLES } from "./constants";
import { daysBetweenISO, todayISO } from "./dates";
import {
  createMemoryRolodexStore,
  createPerson,
  listConnections,
  listFacts,
  listGifts,
  listImportantDates,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
} from "./queries";
import { seedRolodex } from "./seed";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

describe("seedRolodex", () => {
  it("populates demo with 30+ people across every circle and leaves owner empty", async () => {
    const repo = createMemoryRolodexStore();
    await seedRolodex(demoTenant, repo);

    const demo = await listPeople(demoTenant, repo);
    const owner = await listPeople(ownerTenant, repo);
    expect(demo.length).toBeGreaterThanOrEqual(30);
    expect(owner).toEqual([]);
    for (const circle of CIRCLES) {
      expect(demo.some((person) => person.circle === circle)).toBe(true);
    }
  });

  it("seeds a birthday in each of the next three months and a year of interactions", async () => {
    const repo = createMemoryRolodexStore();
    await seedRolodex(demoTenant, repo);
    const today = todayISO();
    const dates = await listImportantDates(demoTenant, repo);
    const birthdays = dates.filter((row) => row.type === "birthday");
    const nextMonths = new Set<number>();
    const [year, month] = today.split("-").map(Number) as [number, number];
    for (const offset of [1, 2, 3]) {
      nextMonths.add(((month - 1 + offset) % 12) + 1);
    }
    const seededMonths = new Set(birthdays.map((row) => row.month));
    for (const expected of nextMonths) {
      expect(seededMonths.has(expected)).toBe(true);
    }
    void year;

    const interactions = await listInteractions(demoTenant, repo);
    expect(
      interactions.some((row) => daysBetweenISO(row.date, today) >= 365),
    ).toBe(true);
  });

  it("seeds at least one of every other remembered type", async () => {
    const repo = createMemoryRolodexStore();
    await seedRolodex(demoTenant, repo);
    expect((await listFacts(demoTenant, repo)).length).toBeGreaterThan(0);
    expect((await listNews(demoTenant, repo)).length).toBeGreaterThan(0);
    expect((await listReminders(demoTenant, repo)).length).toBeGreaterThan(0);
    expect((await listGifts(demoTenant, repo)).length).toBeGreaterThan(0);
    expect((await listConnections(demoTenant, repo)).length).toBeGreaterThan(0);
    expect((await listImportantDates(demoTenant, repo)).length).toBeGreaterThan(
      0,
    );
  });

  it("is idempotent when the tenant already has people", async () => {
    const repo = createMemoryRolodexStore();
    await seedRolodex(demoTenant, repo);
    await createPerson(demoTenant, { name: "Stale Scratch" }, repo);
    const before = (await listPeople(demoTenant, repo)).length;
    await seedRolodex(demoTenant, repo);
    expect((await listPeople(demoTenant, repo)).length).toBe(before);
  });
});

describe("rolodexSeedRows", () => {
  it("builds the reset's rows, every person inside the limits createPerson enforces", async () => {
    const rows = await rolodexSeedRows(demoTenant);
    const seeded = rows
      .filter((entry) => entry.table === people)
      .map((entry) => entry.row as Person);

    expect(seeded.length).toBeGreaterThan(0);
    expect(rows[0]!.table).toBe(people);
    for (const { row } of rows) {
      expect(row).toMatchObject({ tenantId: demoTenant });
    }
    for (const person of seeded) {
      for (const [key, value] of Object.entries(person)) {
        if (typeof value !== "string") continue;
        expect(value.length, key).toBeLessThanOrEqual(
          key === "notes" ? MAX_LONG_TEXT : MAX_SHORT_TEXT,
        );
      }
    }
    // Children only ever point at a person the same reset inserts.
    const ids = new Set(seeded.map((person) => person.id));
    for (const { table, row } of rows) {
      if (table === people) continue;
      const child = row as {
        personId?: string;
        personA?: string;
        personB?: string;
      };
      for (const ref of [child.personId, child.personA, child.personB]) {
        if (ref !== undefined) expect(ids.has(ref)).toBe(true);
      }
    }
  });
});
