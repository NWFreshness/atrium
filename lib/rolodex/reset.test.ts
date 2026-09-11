import { beforeEach, describe, expect, it } from "vitest";
import { createWriteBatch } from "../db/batch-transaction";
import {
  createRecordingDb,
  statementShape,
  statementSql,
} from "../db/batch-test-helpers";
import {
  clearDemoResetters,
  registerDemoResetter,
  resetDemo,
} from "../tenancy/reset-demo";
import {
  createMemoryRolodexRepository,
  createPerson,
  listPeople,
  type RolodexRepository,
} from "./queries";
import { registerRolodexDemoResetter, resetRolodex } from "./reset";
import { seedRolodex } from "./seed";

const demoTenant = "tenant-demo";
const ownerTenant = "tenant-owner";

const demoSession = {
  user: {
    id: "user-demo",
    tenantId: demoTenant,
    role: "demo" as const,
  },
};

function cloneRepo(repo: RolodexRepository): RolodexRepository {
  return {
    people: repo.people.map((row) => ({ ...row })),
    interactions: repo.interactions.map((row) => ({ ...row })),
    importantDates: repo.importantDates.map((row) => ({ ...row })),
    facts: repo.facts.map((row) => ({ ...row })),
    news: repo.news.map((row) => ({ ...row })),
    reminders: repo.reminders.map((row) => ({ ...row })),
    gifts: repo.gifts.map((row) => ({ ...row })),
    connections: repo.connections.map((row) => ({ ...row })),
  };
}

function commitRepo(
  target: RolodexRepository,
  source: RolodexRepository,
): void {
  target.people.splice(0, target.people.length, ...source.people);
  target.interactions.splice(
    0,
    target.interactions.length,
    ...source.interactions,
  );
  target.importantDates.splice(
    0,
    target.importantDates.length,
    ...source.importantDates,
  );
  target.facts.splice(0, target.facts.length, ...source.facts);
  target.news.splice(0, target.news.length, ...source.news);
  target.reminders.splice(0, target.reminders.length, ...source.reminders);
  target.gifts.splice(0, target.gifts.length, ...source.gifts);
  target.connections.splice(
    0,
    target.connections.length,
    ...source.connections,
  );
}

describe("resetRolodex", () => {
  it("wipes then reseeds the demo tenant", async () => {
    const repo = createMemoryRolodexRepository();
    await seedRolodex(demoTenant, repo);
    await createPerson(demoTenant, { name: "Stale Scratch" }, repo);
    const seededNames = (await listPeople(demoTenant, repo))
      .filter((person) => person.name !== "Stale Scratch")
      .map((person) => person.name)
      .sort();

    await resetRolodex(undefined, demoTenant, repo);

    const people = await listPeople(demoTenant, repo);
    expect(people.map((person) => person.name).sort()).toEqual(seededNames);
    expect(people.some((person) => person.name === "Stale Scratch")).toBe(
      false,
    );
  });

  it("does not change the owner tenant", async () => {
    const repo = createMemoryRolodexRepository();
    await seedRolodex(demoTenant, repo);
    await createPerson(ownerTenant, { name: "Owner Notes" }, repo);

    await resetRolodex(undefined, demoTenant, repo);

    const ownerPeople = await listPeople(ownerTenant, repo);
    expect(ownerPeople.map((person) => person.name)).toEqual(["Owner Notes"]);
  });

  it("throws when no memory repo and no DATABASE_URL", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(resetRolodex(undefined, demoTenant)).rejects.toThrow(
        "Rolodex store required",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previous;
      }
    }
  });
});

describe("registerRolodexDemoResetter", () => {
  beforeEach(() => {
    clearDemoResetters();
  });

  it("rolls back when a resetter throws inside injected runInTransaction", async () => {
    const committed = createMemoryRolodexRepository();
    await seedRolodex(demoTenant, committed);
    await createPerson(demoTenant, { name: "Stale Scratch" }, committed);

    async function runInTransaction(
      work: (tx: RolodexRepository) => Promise<void>,
    ): Promise<void> {
      const tx = cloneRepo(committed);
      try {
        await work(tx);
        commitRepo(committed, tx);
      } catch (error) {
        throw error;
      }
    }

    registerRolodexDemoResetter(committed);
    registerDemoResetter(async () => {
      throw new Error("resetter failed");
    });

    await expect(
      resetDemo(async () => demoSession, { runInTransaction }),
    ).rejects.toThrow("resetter failed");

    const people = await listPeople(demoTenant, committed);
    expect(people.some((person) => person.name === "Stale Scratch")).toBe(true);
  });
});

describe("resetRolodex inside a reset batch", () => {
  it("collects the deletes in FK order, then the whole reseed, as one batch", async () => {
    const { db, batches } = createRecordingDb();
    const batch = createWriteBatch(() => db);

    await resetRolodex(batch, demoTenant);

    expect(batches).toHaveLength(0);

    await batch.flush();

    expect(batches).toHaveLength(1);
    const statements = batches[0] ?? [];
    expect(statements.slice(0, 8).map(statementShape)).toEqual([
      "delete from connections",
      "delete from gifts",
      "delete from reminders",
      "delete from news",
      "delete from facts",
      "delete from importantDates",
      "delete from interactions",
      "delete from people",
    ]);
    const reseed = statements.slice(8);
    expect(reseed.length).toBeGreaterThan(30);
    expect(
      reseed.every((row) => statementShape(row).startsWith("insert into")),
    ).toBe(true);
    for (const statement of statements) {
      expect(statementSql(statement).params).toContain(demoTenant);
    }
  });
});
