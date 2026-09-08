import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ACTIVITY_TYPES, CONTACT_STATUSES, DEAL_STAGES } from "./constants";
import {
  createActivity,
  createContact,
  createDeal,
  createMemoryCrmRepository,
  createOrganization,
  deleteActivity,
  deleteContact,
  deleteDeal,
  deleteOrganization,
  getActivity,
  getContact,
  getDeal,
  getOrganization,
  listActivities,
  listContacts,
  listDeals,
  listOrganizations,
  updateActivity,
  updateContact,
  updateDeal,
  updateOrganization,
} from "./queries";
import {
  activities,
  activityTypeEnum,
  contactStatusEnum,
  contacts,
  dealStageEnum,
  deals,
  organizations,
} from "./schema";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmRepository();
}

describe("CRM schema", () => {
  it("puts tenantId on every table", () => {
    for (const table of [organizations, contacts, deals, activities]) {
      expect(getTableColumns(table).tenantId).toBeDefined();
    }
  });

  it("uses constants for deal stages, contact statuses, and activity types", () => {
    expect(dealStageEnum.enumValues).toEqual([...DEAL_STAGES]);
    expect(contactStatusEnum.enumValues).toEqual([...CONTACT_STATUSES]);
    expect(activityTypeEnum.enumValues).toEqual([...ACTIVITY_TYPES]);
  });
});

describe("tenantId is required", () => {
  it("throws when tenantId is missing or empty on every query helper", async () => {
    const memory = repo();
    const emptyIds = ["", "  "] as const;

    for (const tenantId of emptyIds) {
      await expect(listOrganizations(tenantId, memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(getOrganization(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createOrganization(tenantId, { name: "Acme" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateOrganization(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteOrganization(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listContacts(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getContact(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createContact(tenantId, { name: "Ada", status: "lead" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateContact(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteContact(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listDeals(tenantId, memory)).rejects.toThrow(/tenantId/);
      await expect(getDeal(tenantId, "id", memory)).rejects.toThrow(/tenantId/);
      await expect(
        createDeal(
          tenantId,
          {
            name: "Deal",
            stage: "New",
            value: 1000,
            probability: 10,
            boardOrder: 0,
          },
          memory,
        ),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateDeal(tenantId, "id", { name: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteDeal(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );

      await expect(listActivities(tenantId, memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(getActivity(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
      await expect(
        createActivity(
          tenantId,
          { type: "note", description: "hello", done: false },
          memory,
        ),
      ).rejects.toThrow(/tenantId/);
      await expect(
        updateActivity(tenantId, "id", { description: "X" }, memory),
      ).rejects.toThrow(/tenantId/);
      await expect(deleteActivity(tenantId, "id", memory)).rejects.toThrow(
        /tenantId/,
      );
    }
  });
});

describe("organizations CRUD", () => {
  it("creates, lists, gets, updates, and deletes within a tenant", async () => {
    const memory = repo();
    const created = await createOrganization(
      tenantA,
      {
        name: "Acme",
        website: "https://acme.test",
        industry: "Widgets",
        notes: "VIP",
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.id).toBeTruthy();
    expect(created.name).toBe("Acme");
    expect(created.website).toBe("https://acme.test");

    expect(await listOrganizations(tenantA, memory)).toEqual([created]);
    expect(await getOrganization(tenantA, created.id, memory)).toEqual(created);

    const updated = await updateOrganization(
      tenantA,
      created.id,
      { name: "Acme Inc" },
      memory,
    );
    expect(updated?.name).toBe("Acme Inc");
    expect(updated?.website).toBe("https://acme.test");

    const deleted = await deleteOrganization(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getOrganization(tenantA, created.id, memory)).toBeNull();
    expect(await listOrganizations(tenantA, memory)).toEqual([]);
  });
});

describe("contacts CRUD", () => {
  it("creates, lists, gets, updates, and deletes within a tenant", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const created = await createContact(
      tenantA,
      {
        name: "Ada Lovelace",
        email: "ada@acme.test",
        phone: "555-0100",
        jobTitle: "Analyst",
        organizationId: org.id,
        status: "lead",
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.status).toBe("lead");
    expect(created.organizationId).toBe(org.id);
    expect(await listContacts(tenantA, memory)).toEqual([created]);
    expect(await getContact(tenantA, created.id, memory)).toEqual(created);

    const updated = await updateContact(
      tenantA,
      created.id,
      { status: "qualified" },
      memory,
    );
    expect(updated?.status).toBe("qualified");
    expect(updated?.name).toBe("Ada Lovelace");

    const deleted = await deleteContact(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getContact(tenantA, created.id, memory)).toBeNull();
  });
});

describe("deals CRUD", () => {
  it("creates, lists, gets, updates, and deletes within a tenant", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const contact = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const closeDate = new Date("2026-12-01T00:00:00.000Z");
    const created = await createDeal(
      tenantA,
      {
        name: "Widget rollout",
        organizationId: org.id,
        contactId: contact.id,
        stage: "Qualified",
        value: 25000,
        probability: 25,
        closeDate,
        boardOrder: 2,
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.value).toBe(25000);
    expect(created.probability).toBe(25);
    expect(created.boardOrder).toBe(2);
    expect(created.closeDate).toEqual(closeDate);
    expect(await listDeals(tenantA, memory)).toEqual([created]);
    expect(await getDeal(tenantA, created.id, memory)).toEqual(created);

    const updated = await updateDeal(
      tenantA,
      created.id,
      { stage: "Proposal", probability: 50, value: 30000 },
      memory,
    );
    expect(updated?.stage).toBe("Proposal");
    expect(updated?.probability).toBe(50);
    expect(updated?.value).toBe(30000);

    const deleted = await deleteDeal(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getDeal(tenantA, created.id, memory)).toBeNull();
  });
});

describe("activities CRUD", () => {
  it("creates, lists, gets, updates, and deletes within a tenant", async () => {
    const memory = repo();
    const contact = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const deal = await createDeal(
      tenantA,
      {
        name: "Widget rollout",
        stage: "New",
        value: 1000,
        probability: 10,
        boardOrder: 0,
      },
      memory,
    );
    const occurredAt = new Date("2026-09-01T15:00:00.000Z");
    const dueDate = new Date("2026-09-08T15:00:00.000Z");
    const created = await createActivity(
      tenantA,
      {
        type: "call",
        contactId: contact.id,
        dealId: deal.id,
        description: "Intro call",
        occurredAt,
        dueDate,
        done: false,
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.type).toBe("call");
    expect(created.done).toBe(false);
    expect(created.occurredAt).toEqual(occurredAt);
    expect(created.dueDate).toEqual(dueDate);
    expect(await listActivities(tenantA, memory)).toEqual([created]);
    expect(await getActivity(tenantA, created.id, memory)).toEqual(created);

    const updated = await updateActivity(
      tenantA,
      created.id,
      { done: true, description: "Intro call complete" },
      memory,
    );
    expect(updated?.done).toBe(true);
    expect(updated?.description).toBe("Intro call complete");

    const deleted = await deleteActivity(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getActivity(tenantA, created.id, memory)).toBeNull();
  });
});

describe("tenant isolation", () => {
  it("prevents tenant A from reading or writing tenant B rows", async () => {
    const memory = repo();
    const orgB = await createOrganization(tenantB, { name: "Beta Co" }, memory);
    const contactB = await createContact(
      tenantB,
      { name: "Bob", organizationId: orgB.id, status: "customer" },
      memory,
    );
    const dealB = await createDeal(
      tenantB,
      {
        name: "Beta deal",
        organizationId: orgB.id,
        contactId: contactB.id,
        stage: "Won",
        value: 9000,
        probability: 100,
        boardOrder: 1,
      },
      memory,
    );
    const activityB = await createActivity(
      tenantB,
      {
        type: "email",
        contactId: contactB.id,
        dealId: dealB.id,
        description: "Congrats",
        done: true,
      },
      memory,
    );

    expect(await listOrganizations(tenantA, memory)).toEqual([]);
    expect(await listContacts(tenantA, memory)).toEqual([]);
    expect(await listDeals(tenantA, memory)).toEqual([]);
    expect(await listActivities(tenantA, memory)).toEqual([]);

    expect(await getOrganization(tenantA, orgB.id, memory)).toBeNull();
    expect(await getContact(tenantA, contactB.id, memory)).toBeNull();
    expect(await getDeal(tenantA, dealB.id, memory)).toBeNull();
    expect(await getActivity(tenantA, activityB.id, memory)).toBeNull();

    expect(
      await updateOrganization(tenantA, orgB.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(
      await updateContact(tenantA, contactB.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(
      await updateDeal(tenantA, dealB.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(
      await updateActivity(
        tenantA,
        activityB.id,
        { description: "Hacked" },
        memory,
      ),
    ).toBeNull();

    expect(await deleteOrganization(tenantA, orgB.id, memory)).toBeNull();
    expect(await deleteContact(tenantA, contactB.id, memory)).toBeNull();
    expect(await deleteDeal(tenantA, dealB.id, memory)).toBeNull();
    expect(await deleteActivity(tenantA, activityB.id, memory)).toBeNull();

    expect(await getOrganization(tenantB, orgB.id, memory)).toMatchObject({
      name: "Beta Co",
    });
    expect(await getContact(tenantB, contactB.id, memory)).toMatchObject({
      name: "Bob",
    });
    expect(await getDeal(tenantB, dealB.id, memory)).toMatchObject({
      name: "Beta deal",
    });
    expect(await getActivity(tenantB, activityB.id, memory)).toMatchObject({
      description: "Congrats",
    });
  });
});

describe("delete organization", () => {
  it("sets related contact and deal organizationId to null instead of cascade-deleting", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const contact = await createContact(
      tenantA,
      { name: "Ada", organizationId: org.id, status: "lead" },
      memory,
    );
    const deal = await createDeal(
      tenantA,
      {
        name: "Widget rollout",
        organizationId: org.id,
        stage: "New",
        value: 1000,
        probability: 10,
        boardOrder: 0,
      },
      memory,
    );

    await deleteOrganization(tenantA, org.id, memory);

    expect(await getOrganization(tenantA, org.id, memory)).toBeNull();
    expect(await getContact(tenantA, contact.id, memory)).toMatchObject({
      id: contact.id,
      organizationId: null,
    });
    expect(await getDeal(tenantA, deal.id, memory)).toMatchObject({
      id: deal.id,
      organizationId: null,
    });
  });
});
