import { describe, expect, it } from "vitest";
import { CIRCLES } from "./constants";
import { daysBetweenISO, todayISO } from "./dates";
import {
  createMemoryRolodexRepository,
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
    const repo = createMemoryRolodexRepository();
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
    const repo = createMemoryRolodexRepository();
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
    const repo = createMemoryRolodexRepository();
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
    const repo = createMemoryRolodexRepository();
    await seedRolodex(demoTenant, repo);
    await createPerson(demoTenant, { name: "Stale Scratch" }, repo);
    const before = (await listPeople(demoTenant, repo)).length;
    await seedRolodex(demoTenant, repo);
    expect((await listPeople(demoTenant, repo)).length).toBe(before);
  });
});
