import { describe, expect, it } from "vitest";
import {
  createDealForSession,
  deleteDealForSession,
  getDealForSession,
  listDealsForSession,
  updateDealForSession,
} from "./deal-actions";
import {
  createContact,
  createDeal,
  createMemoryCrmRepository,
  createOrganization,
  getDeal,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

const sessionA = {
  user: {
    id: "user-a",
    tenantId: tenantA,
    role: "owner" as const,
  },
};

function getSessionA() {
  return Promise.resolve(sessionA);
}

function repo() {
  return createMemoryCrmRepository();
}

describe("deal session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const contact = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const created = await createDealForSession(
      getSessionA,
      {
        name: "Widget rollout",
        organizationId: org.id,
        contactId: contact.id,
        stage: "Qualified",
        value: 25000,
        tenantId: tenantB,
      },
      memory,
    );

    expect(created?.tenantId).toBe(tenantA);
    expect(created?.name).toBe("Widget rollout");
    expect(created?.organizationId).toBe(org.id);
    expect(created?.contactId).toBe(contact.id);
    expect(created?.probability).toBe(25);
    expect(created?.boardOrder).toBe(0);
    expect(await getDeal(tenantB, created!.id, memory)).toBeNull();

    expect(await listDealsForSession(getSessionA, {}, memory)).toEqual([
      created,
    ]);
    expect(await getDealForSession(getSessionA, created!.id, memory)).toEqual(
      created,
    );

    const updated = await updateDealForSession(
      getSessionA,
      created!.id,
      { stage: "Proposal", tenantId: tenantB },
      memory,
    );
    expect(updated?.stage).toBe("Proposal");
    expect(updated?.probability).toBe(50);
    expect(updated?.tenantId).toBe(tenantA);
    expect(updated?.name).toBe("Widget rollout");

    const deleted = await deleteDealForSession(
      getSessionA,
      created!.id,
      memory,
    );
    expect(deleted?.id).toBe(created!.id);
    expect(
      await getDealForSession(getSessionA, created!.id, memory),
    ).toBeNull();
  });

  it("lists with search and organizationId against the session tenant only", async () => {
    const memory = repo();
    const acme = await createOrganization(tenantA, { name: "Acme" }, memory);
    const widget = await createDealForSession(
      getSessionA,
      {
        name: "Widget rollout",
        organizationId: acme.id,
        stage: "New",
        value: 1000,
      },
      memory,
    );
    await createDealForSession(
      getSessionA,
      { name: "Other deal", stage: "New", value: 500 },
      memory,
    );
    await createDeal(
      tenantB,
      { name: "Widget east", stage: "New", value: 100 },
      memory,
    );

    expect(
      await listDealsForSession(
        getSessionA,
        { q: "widget", tenantId: tenantB },
        memory,
      ),
    ).toEqual([widget]);
    expect(
      await listDealsForSession(
        getSessionA,
        { organizationId: acme.id, tenantId: tenantB },
        memory,
      ),
    ).toEqual([widget]);
  });

  it("returns null for missing or other-tenant deals", async () => {
    const memory = repo();
    const other = await createDeal(
      tenantB,
      { name: "Beta deal", stage: "Won", value: 9000 },
      memory,
    );

    expect(await getDealForSession(getSessionA, other.id, memory)).toBeNull();
    expect(await getDealForSession(getSessionA, "missing", memory)).toBeNull();
    expect(
      await updateDealForSession(
        getSessionA,
        other.id,
        { name: "Hacked" },
        memory,
      ),
    ).toBeNull();
    expect(
      await deleteDealForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(await getDeal(tenantB, other.id, memory)).toMatchObject({
      name: "Beta deal",
    });
  });

  it("rejects create when organizationId belongs to another tenant", async () => {
    const memory = repo();
    const otherOrg = await createOrganization(
      tenantB,
      { name: "Beta Co" },
      memory,
    );

    expect(
      await createDealForSession(
        getSessionA,
        {
          name: "Widget",
          organizationId: otherOrg.id,
          stage: "New",
          value: 1000,
        },
        memory,
      ),
    ).toBeNull();
    expect(await listDealsForSession(getSessionA, {}, memory)).toEqual([]);
  });

  it("rejects create when contactId belongs to another tenant", async () => {
    const memory = repo();
    const otherContact = await createContact(
      tenantB,
      { name: "Bob", status: "lead" },
      memory,
    );

    expect(
      await createDealForSession(
        getSessionA,
        {
          name: "Widget",
          contactId: otherContact.id,
          stage: "New",
          value: 1000,
        },
        memory,
      ),
    ).toBeNull();
    expect(await listDealsForSession(getSessionA, {}, memory)).toEqual([]);
  });

  it("rejects update when organizationId or contactId belongs to another tenant", async () => {
    const memory = repo();
    const deal = await createDealForSession(
      getSessionA,
      { name: "Widget", stage: "New", value: 1000 },
      memory,
    );
    const otherOrg = await createOrganization(
      tenantB,
      { name: "Beta Co" },
      memory,
    );
    const otherContact = await createContact(
      tenantB,
      { name: "Bob", status: "lead" },
      memory,
    );

    expect(
      await updateDealForSession(
        getSessionA,
        deal!.id,
        { organizationId: otherOrg.id },
        memory,
      ),
    ).toBeNull();
    expect(
      await updateDealForSession(
        getSessionA,
        deal!.id,
        { contactId: otherContact.id },
        memory,
      ),
    ).toBeNull();
    expect(await getDeal(tenantA, deal!.id, memory)).toMatchObject({
      name: "Widget",
      organizationId: null,
      contactId: null,
    });
  });

  it("rejects create and update when stage is not a deal stage", async () => {
    const memory = repo();
    const created = await createDealForSession(
      getSessionA,
      {
        name: "Widget",
        stage: "Prospect" as "New",
        value: 1000,
      },
      memory,
    );
    expect(created).toBeNull();
    expect(await listDealsForSession(getSessionA, {}, memory)).toEqual([]);

    const deal = await createDealForSession(
      getSessionA,
      { name: "Widget", stage: "New", value: 1000 },
      memory,
    );
    expect(
      await updateDealForSession(
        getSessionA,
        deal!.id,
        { stage: "Prospect" as "New" },
        memory,
      ),
    ).toBeNull();
    expect(await getDeal(tenantA, deal!.id, memory)).toMatchObject({
      stage: "New",
    });
  });

  it("throws when unauthenticated", async () => {
    const memory = repo();
    await expect(
      createDealForSession(
        async () => null,
        { name: "Widget", stage: "New", value: 1000 },
        memory,
      ),
    ).rejects.toThrow("Unauthenticated");
  });
});
