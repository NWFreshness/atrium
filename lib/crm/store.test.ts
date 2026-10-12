import { describe, expect, it } from "vitest";
import {
  createRecordingDb,
  statementSql,
  statementsMissingTenant,
} from "../db/batch-test-helpers";
import { createContact, DuplicateContactEmailError } from "./queries";
import type { Activity, Contact, Deal, Organization } from "./queries-shared";
import { createDrizzleCrmStore, createMemoryCrmStore } from "./store";

const tenant = "tenant-a";
const createdAt = new Date(0);
const organization: Organization = {
  id: "o1",
  tenantId: tenant,
  name: "Acme",
  website: null,
  industry: null,
  notes: null,
  createdAt,
};
const contact: Contact = {
  id: "c1",
  tenantId: tenant,
  name: "Ada",
  email: "Ada@Example.com",
  phone: null,
  jobTitle: null,
  organizationId: null,
  status: "lead",
  createdAt,
};
const deal: Deal = {
  id: "d1",
  tenantId: tenant,
  name: "Deal",
  organizationId: null,
  contactId: null,
  stage: "New",
  value: 1,
  probability: 10,
  closeDate: null,
  boardOrder: 0,
  createdAt,
};
const activity: Activity = {
  id: "a1",
  tenantId: tenant,
  type: "note",
  contactId: null,
  dealId: null,
  description: "x",
  occurredAt: null,
  dueDate: null,
  done: false,
  createdAt,
};

describe("the Drizzle CRM store scopes every statement to its tenant", () => {
  it("binds the tenant in every read, update and delete it builds", async () => {
    const { db, queries } = createRecordingDb();
    const store = createDrizzleCrmStore(db);

    await store.organizations.list(tenant);
    await store.organizations.list(tenant, "acme");
    await store.organizations.get(tenant, "o1");
    await store.organizations.insert(organization);
    await store.organizations.update(tenant, "o1", { name: "B" });
    await store.organizations.delete(tenant, "o1");
    await store.organizations.cascadePreview(tenant, "o1");

    await store.contacts.list(tenant);
    await store.contacts.list(tenant, {
      q: "ada",
      status: "lead",
      organizationId: "o1",
    });
    await store.contacts.get(tenant, "c1");
    await store.contacts.insert(contact);
    await store.contacts.update(tenant, "c1", { name: "B" });
    await store.contacts.delete(tenant, "c1");
    await store.contacts.cascadePreview(tenant, "c1");
    await store.contacts.findByEmail(tenant, "ada@example.com");
    await store.contacts.findByEmail(tenant, "ada@example.com", "c1");

    await store.deals.list(tenant);
    await store.deals.list(tenant, {
      q: "deal",
      stage: "New",
      organizationId: "o1",
      contactId: "c1",
      closeAfter: createdAt,
      closeBefore: createdAt,
    });
    await store.deals.get(tenant, "d1");
    await store.deals.insert(deal);
    await store.deals.update(tenant, "d1", { name: "B" });
    await store.deals.delete(tenant, "d1");
    await store.deals.cascadePreview(tenant, "d1");
    await store.deals.nextBoardOrder(tenant, "New");

    await store.activities.list(tenant);
    await store.activities.list(tenant, { contactId: "c1", dealId: "d1" });
    await store.activities.get(tenant, "a1");
    await store.activities.insert(activity);
    await store.activities.update(tenant, "a1", { done: true });
    await store.activities.delete(tenant, "a1");

    expect(queries.length).toBeGreaterThanOrEqual(30);
    expect(statementsMissingTenant(queries, tenant)).toEqual([]);
  });
});

describe("both CRM adapters agree on contact email", () => {
  it("matches the lowercased needle against lower(email) in SQL and in memory", async () => {
    const { db, queries } = createRecordingDb();
    await createDrizzleCrmStore(db).contacts.findByEmail(
      tenant,
      "ada@example.com",
    );
    expect(queries[0]!.sql).toContain('lower("contacts"."email") = ');
    expect(queries[0]!.params).toContain("ada@example.com");

    const memory = createMemoryCrmStore();
    await memory.contacts.insert(contact);
    expect(
      (await memory.contacts.findByEmail(tenant, "ada@example.com"))?.id,
    ).toBe("c1");
    expect(
      await memory.contacts.findByEmail(tenant, "ada@example.com", "c1"),
    ).toBeNull();
    expect(
      await memory.contacts.findByEmail("tenant-b", "ada@example.com"),
    ).toBeNull();
  });

  it("leaves the duplicate rule to the barrel: neither adapter refuses an insert itself", async () => {
    const memory = createMemoryCrmStore();
    await memory.contacts.insert(contact);
    await expect(
      memory.contacts.insert({ ...contact, id: "c2" }),
    ).resolves.toMatchObject({ id: "c2" });
  });

  it("runs the same pre-check through the Drizzle store before it inserts", async () => {
    const { db, queries } = createRecordingDb();
    await createContact(
      tenant,
      { name: "Ada", email: "  Ada@Example.com ", status: "lead" },
      createDrizzleCrmStore(db),
    );
    expect(queries.map(({ sql }) => sql.split(" ")[0])).toEqual([
      "select",
      "insert",
    ]);
    expect(queries[0]!.sql).toContain('lower("contacts"."email") = ');
    expect(queries[0]!.params).toContain("ada@example.com");
    expect(queries[1]!.params).toContain("Ada@Example.com");
  });

  it("turns the unique index refusing a raced insert into the duplicate error", async () => {
    const { db } = createRecordingDb();
    db.insert = (() => {
      throw Object.assign(new Error("duplicate key value"), { code: "23505" });
    }) as never;
    const raced = createDrizzleCrmStore(db).contacts.insert(contact);
    await expect(raced).rejects.toBeInstanceOf(DuplicateContactEmailError);
    await expect(raced).rejects.toMatchObject({ existing: undefined });
  });
});

describe("deals.reorder", () => {
  const rows = [
    { id: "d1", stage: "Won" as const, boardOrder: 0, probability: 100 },
    { id: "d2", stage: "Won" as const, boardOrder: 1 },
  ];

  it("sends the whole reorder as one batch of tenant-scoped updates", async () => {
    const { db, batches, queries } = createRecordingDb();
    await createDrizzleCrmStore(db).deals.reorder(tenant, rows);

    expect(queries).toEqual([]);
    expect(batches).toHaveLength(1);
    const sent = batches[0]!.map(statementSql);
    expect(sent.every(({ sql }) => sql.startsWith('update "deals" set '))).toBe(
      true,
    );
    expect(sent.map(({ sql }) => sql.includes('"probability" = '))).toEqual([
      true,
      false,
    ]);
    expect(sent.map(({ params }) => params.slice(-2))).toEqual([
      [tenant, "d1"],
      [tenant, "d2"],
    ]);
    expect(sent[0]!.params).toEqual(expect.arrayContaining(["Won", 0, 100]));
    expect(statementsMissingTenant(sent, tenant)).toEqual([]);
  });

  it("applies the same rows in memory, and only inside the tenant", async () => {
    const memory = createMemoryCrmStore();
    await memory.deals.insert(deal);
    await memory.deals.insert({ ...deal, id: "d2" });
    await memory.deals.insert({
      ...deal,
      id: "d1-other",
      tenantId: "tenant-b",
    });

    await memory.deals.reorder(tenant, rows);
    await memory.deals.reorder(tenant, [
      { id: "d1-other", stage: "Lost", boardOrder: 9 },
    ]);

    expect(await memory.deals.get(tenant, "d1")).toMatchObject({
      stage: "Won",
      boardOrder: 0,
      probability: 100,
    });
    expect(await memory.deals.get(tenant, "d2")).toMatchObject({
      stage: "Won",
      boardOrder: 1,
      probability: 10,
    });
    expect(await memory.deals.get("tenant-b", "d1-other")).toMatchObject({
      stage: "New",
      boardOrder: 0,
    });
  });
});
