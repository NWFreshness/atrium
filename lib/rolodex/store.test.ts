import { describe, expect, it } from "vitest";
import {
  createRecordingDb,
  statementSql,
  statementsMissingTenant,
} from "../db/batch-test-helpers";
import { personRow } from "./queries-shared";
import { createDrizzleRolodexStore } from "./store";

const tenant = "tenant-a";

describe("the Drizzle Rolodex store scopes every statement to its tenant", () => {
  it("binds the tenant in every read, update and delete it builds", async () => {
    const { db, queries } = createRecordingDb();
    const store = createDrizzleRolodexStore(db);
    const person = personRow(tenant, { name: "Ada" });
    const child = { id: "c1", tenantId: tenant, personId: person.id };
    const createdAt = new Date(0);

    await store.people.list(tenant);
    await store.people.get(tenant, "p1");
    await store.people.insert(person);
    await store.people.update(tenant, "p1", { name: "Grace" });
    await store.people.delete(tenant, "p1");
    await store.interactions.list(tenant, { personId: "p1" });
    await store.interactions.list(tenant);
    await store.interactions.insert({
      ...child,
      type: "call",
      date: "2026-01-02",
      notes: null,
      createdAt,
    });
    await store.importantDates.list(tenant);
    await store.importantDates.get(tenant, "d1");
    await store.importantDates.insert({
      ...child,
      type: "birthday",
      label: null,
      month: 1,
      day: 2,
      year: null,
      createdAt,
    });
    await store.importantDates.update(tenant, "d1", { day: 3 });
    await store.importantDates.delete(tenant, "d1");
    await store.facts.list(tenant);
    await store.facts.insert({ ...child, text: "x", createdAt });
    await store.news.list(tenant);
    await store.news.insert({
      ...child,
      text: "x",
      date: "2026-01-02",
      createdAt,
    });
    await store.reminders.list(tenant);
    await store.reminders.get(tenant, "r1");
    await store.reminders.insert({
      ...child,
      text: "x",
      dueDate: "2026-01-02",
      done: false,
      doneAt: null,
      createdAt,
    });
    await store.reminders.update(tenant, "r1", { done: true });
    await store.gifts.list(tenant);
    await store.gifts.insert({
      ...child,
      name: "x",
      kind: "idea",
      occasion: null,
      date: "2026-01-02",
      createdAt,
    });
    await store.gifts.delete(tenant, "g1");
    await store.connections.list(tenant, { personId: "p1" });
    await store.connections.list(tenant);
    await store.connections.insert({
      id: "k1",
      tenantId: tenant,
      personA: "p1",
      personB: "p2",
      kind: "sibling",
      aIsParent: false,
      label: null,
      inverseLabel: null,
      note: null,
      createdAt,
    });
    await store.connections.delete(tenant, "k1");

    expect(queries.length).toBeGreaterThanOrEqual(28);
    expect(statementsMissingTenant(queries, tenant)).toEqual([]);
  });

  it("writes an import as one batch of tenant-carrying inserts", async () => {
    const { db, batches, queries } = createRecordingDb();
    const store = createDrizzleRolodexStore(db);
    const ada = personRow(tenant, { name: "Ada" });
    const grace = personRow(tenant, { name: "Grace" });

    await store.importPeople(
      [ada, grace],
      [
        {
          id: "d1",
          tenantId: tenant,
          personId: ada.id,
          type: "birthday",
          label: null,
          month: 12,
          day: 10,
          year: 1815,
          createdAt: new Date(0),
        },
      ],
    );

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const sent = batches[0]!.map(statementSql);
    expect(
      sent.map(({ sql }) => /^insert into "(\w+)"/.exec(sql)?.[1]),
    ).toEqual(["people", "people", "importantDates"]);
    expect(statementsMissingTenant(sent, tenant)).toEqual([]);
  });

  it("sends nothing for an empty import", async () => {
    const { db, batches, queries } = createRecordingDb();
    await createDrizzleRolodexStore(db).importPeople([], []);
    expect(batches).toEqual([]);
    expect(queries).toEqual([]);
  });
});
