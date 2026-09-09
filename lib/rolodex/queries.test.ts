import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  CIRCLES,
  CONNECTION_KINDS,
  DATE_TYPES,
  GIFT_KINDS,
  INTERACTION_TYPES,
} from "./constants";
import {
  createConnection,
  createFact,
  createGift,
  createImportantDate,
  createInteraction,
  createMemoryRolodexRepository,
  createNews,
  createPerson,
  createReminder,
  deletePerson,
  getPerson,
  listConnections,
  listFacts,
  listGifts,
  listImportantDates,
  listInteractions,
  listNews,
  listPeople,
  listReminders,
  updatePerson,
} from "./queries";
import {
  circleEnum,
  connectionKindEnum,
  connections,
  facts,
  giftKindEnum,
  gifts,
  importantDateTypeEnum,
  importantDates,
  interactionTypeEnum,
  interactions,
  news,
  people,
  reminders,
} from "./schema";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryRolodexRepository();
}

function fkOnDelete(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table).foreignKeys.map((key) => {
    const ref = key.reference();
    return `${ref.columns[0]?.name}:${key.onDelete}`;
  });
}

describe("Rolodex schema", () => {
  it("puts tenantId on every table and has no photo column", () => {
    for (const table of [
      people,
      interactions,
      importantDates,
      facts,
      news,
      reminders,
      gifts,
      connections,
    ]) {
      expect(getTableColumns(table).tenantId).toBeDefined();
    }
    expect(
      Object.prototype.hasOwnProperty.call(getTableColumns(people), "photo"),
    ).toBe(false);
  });

  it("uses constants for enums", () => {
    expect(circleEnum.enumValues).toEqual([...CIRCLES]);
    expect(interactionTypeEnum.enumValues).toEqual([...INTERACTION_TYPES]);
    expect(importantDateTypeEnum.enumValues).toEqual([...DATE_TYPES]);
    expect(giftKindEnum.enumValues).toEqual([...GIFT_KINDS]);
    expect(connectionKindEnum.enumValues).toEqual([...CONNECTION_KINDS]);
  });

  it("cascades person children and restricts tenantId", () => {
    expect(fkOnDelete(people)).toEqual(
      expect.arrayContaining(["tenantId:restrict"]),
    );
    expect(fkOnDelete(interactions)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(importantDates)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(facts)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(news)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(reminders)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(gifts)).toEqual(
      expect.arrayContaining(["personId:cascade", "tenantId:restrict"]),
    );
    expect(fkOnDelete(connections)).toEqual(
      expect.arrayContaining([
        "personA:cascade",
        "personB:cascade",
        "tenantId:restrict",
      ]),
    );
  });
});

describe("tenantId is required", () => {
  it("throws when tenantId is missing or empty", async () => {
    const memory = repo();
    for (const tenantId of ["", "  "] as const) {
      await expect(listPeople(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getPerson(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createPerson(tenantId, { name: "Ada" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updatePerson(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deletePerson(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
    }
  });
});

describe("people CRUD", () => {
  it("isolates tenants and computes lastContacted from interactions", async () => {
    const memory = repo();
    const ada = await createPerson(tenantA, { name: "Ada Lovelace" }, memory);
    await createPerson(tenantB, { name: "Grace Hopper" }, memory);
    await createInteraction(
      tenantA,
      { personId: ada.id, type: "call", date: "2025-06-01" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: ada.id, type: "email", date: "2026-01-15" },
      memory,
    );
    await createNews(
      tenantA,
      {
        personId: ada.id,
        text: "Started at Analytical Engines",
        date: "2026-02-01",
      },
      memory,
    );

    const listed = await listPeople(tenantA, memory);
    expect(listed.map((row) => row.name)).toEqual(["Ada Lovelace"]);
    expect(listed[0]?.lastContacted).toBe("2026-01-15");
    expect(listed[0]?.latestNews?.text).toBe("Started at Analytical Engines");
    expect(listed[0]?.status).toBeDefined();

    const other = await listPeople(tenantB, memory);
    expect(other.map((row) => row.name)).toEqual(["Grace Hopper"]);
    expect(await getPerson(tenantB, ada.id, memory)).toBeNull();
  });

  it("updates a person in the same tenant", async () => {
    const memory = repo();
    const person = await createPerson(
      tenantA,
      { name: "Maya Chen", circle: "wider" },
      memory,
    );
    const updated = await updatePerson(
      tenantA,
      person.id,
      { circle: "inner", tags: ["family"] },
      memory,
    );
    expect(updated?.circle).toBe("inner");
    expect(updated?.tags).toEqual(["family"]);
  });

  it("searches by name, company, and email and filters circle and tag", async () => {
    const memory = repo();
    await createPerson(
      tenantA,
      {
        name: "Maya Chen",
        company: "Figma",
        email: "maya@example.com",
        circle: "inner",
        tags: ["family"],
      },
      memory,
    );
    await createPerson(
      tenantA,
      {
        name: "Sam Okoye",
        company: "Northwind",
        email: "sam@example.com",
        circle: "close",
        tags: ["work"],
      },
      memory,
    );
    await createPerson(
      tenantB,
      { name: "Maya Other", company: "Figma", email: "maya@other.test" },
      memory,
    );

    expect(
      (await listPeople(tenantA, memory, { q: "maya" })).map((row) => row.name),
    ).toEqual(["Maya Chen"]);
    expect(
      (await listPeople(tenantA, memory, { q: "northwind" })).map(
        (row) => row.name,
      ),
    ).toEqual(["Sam Okoye"]);
    expect(
      (await listPeople(tenantA, memory, { q: "sam@example" })).map(
        (row) => row.name,
      ),
    ).toEqual(["Sam Okoye"]);
    expect(
      (await listPeople(tenantA, memory, { circle: "inner" })).map(
        (row) => row.name,
      ),
    ).toEqual(["Maya Chen"]);
    expect(
      (await listPeople(tenantA, memory, { tag: "work" })).map(
        (row) => row.name,
      ),
    ).toEqual(["Sam Okoye"]);
  });

  it("cascades children and both-sided connections on delete", async () => {
    const memory = repo();
    const sam = await createPerson(tenantA, { name: "Sam Okoye" }, memory);
    const kate = await createPerson(tenantA, { name: "Kate Okoye" }, memory);
    await createInteraction(
      tenantA,
      { personId: sam.id, type: "met", date: "2026-01-01" },
      memory,
    );
    await createImportantDate(
      tenantA,
      { personId: sam.id, type: "birthday", month: 2, day: 29, year: 1992 },
      memory,
    );
    await createFact(
      tenantA,
      { personId: sam.id, text: "Allergic to shellfish" },
      memory,
    );
    await createNews(
      tenantA,
      { personId: sam.id, text: "Moved to Berlin", date: "2025-11-01" },
      memory,
    );
    await createReminder(
      tenantA,
      { personId: sam.id, text: "Send the book", dueDate: "2026-04-01" },
      memory,
    );
    await createGift(
      tenantA,
      {
        personId: sam.id,
        name: "Field notes",
        kind: "idea",
        date: "2026-03-01",
      },
      memory,
    );
    await createConnection(
      tenantA,
      {
        personA: sam.id,
        personB: kate.id,
        kind: "parent_child",
        aIsParent: true,
      },
      memory,
    );

    expect(await deletePerson(tenantA, sam.id, memory)).toBe(true);
    expect(await getPerson(tenantA, sam.id, memory)).toBeNull();
    expect(await listInteractions(tenantA, memory)).toEqual([]);
    expect(await listImportantDates(tenantA, memory)).toEqual([]);
    expect(await listFacts(tenantA, memory)).toEqual([]);
    expect(await listNews(tenantA, memory)).toEqual([]);
    expect(await listReminders(tenantA, memory)).toEqual([]);
    expect(await listGifts(tenantA, memory)).toEqual([]);
    expect(
      await listConnections(tenantA, memory, { personId: kate.id }),
    ).toEqual([]);
    expect((await getPerson(tenantA, kate.id, memory))?.name).toBe(
      "Kate Okoye",
    );
  });

  it("throws Rolodex store required without DATABASE_URL or repo", async () => {
    const previous = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      await expect(listPeople(tenantA)).rejects.toThrow(
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
