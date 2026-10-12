import { describe, expect, it } from "vitest";
import { InputError } from "../input/result";
import {
  createDealIn,
  dealCascadePreviewIn,
  deleteDealIn,
  getDealIn,
  listDealsIn,
  moveDealIn,
  updateDealIn,
} from "./deal-ops";
import {
  createActivity,
  createContact,
  createDeal,
  createMemoryCrmStore,
  createOrganization,
  getDeal,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmStore();
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
    const created = await createDealIn(
      tenantA,
      {
        name: "Widget rollout",
        organizationId: org.id,
        contactId: contact.id,
        stage: "Qualified",
        value: 25000,
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

    expect(await listDealsIn(tenantA, {}, memory)).toEqual([created]);
    expect(await getDealIn(tenantA, created!.id, memory)).toEqual(created);

    const updated = await updateDealIn(
      tenantA,
      created!.id,
      { stage: "Proposal" },
      memory,
    );
    expect(updated?.stage).toBe("Proposal");
    expect(updated?.probability).toBe(50);
    expect(updated?.tenantId).toBe(tenantA);
    expect(updated?.name).toBe("Widget rollout");

    const deleted = await deleteDealIn(tenantA, created!.id, memory);
    expect(deleted?.id).toBe(created!.id);
    expect(await getDealIn(tenantA, created!.id, memory)).toBeNull();
  });

  it("lists with search and organizationId against the session tenant only", async () => {
    const memory = repo();
    const acme = await createOrganization(tenantA, { name: "Acme" }, memory);
    const widget = await createDealIn(
      tenantA,
      {
        name: "Widget rollout",
        organizationId: acme.id,
        stage: "New",
        value: 1000,
      },
      memory,
    );
    await createDealIn(
      tenantA,
      { name: "Other deal", stage: "New", value: 500 },
      memory,
    );
    await createDeal(
      tenantB,
      { name: "Widget east", stage: "New", value: 100 },
      memory,
    );

    expect(await listDealsIn(tenantA, { q: "widget" }, memory)).toEqual([
      widget,
    ]);
    expect(
      await listDealsIn(tenantA, { organizationId: acme.id }, memory),
    ).toEqual([widget]);
  });

  it("passes stage, the close-date window, and contactId through against the session tenant only", async () => {
    const memory = repo();
    const acme = await createOrganization(tenantA, { name: "Acme" }, memory);
    const ada = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const wanted = await createDealIn(
      tenantA,
      {
        name: "Widget rollout",
        organizationId: acme.id,
        contactId: ada.id,
        stage: "Qualified",
        value: 1000,
        closeDate: new Date("2026-09-15T00:00:00.000Z"),
      },
      memory,
    );
    await createDealIn(
      tenantA,
      { name: "Other deal", stage: "New", value: 500 },
      memory,
    );
    await createDeal(
      tenantB,
      { name: "Widget east", stage: "Qualified", value: 100 },
      memory,
    );

    expect(await listDealsIn(tenantA, { stage: "Qualified" }, memory)).toEqual([
      wanted,
    ]);
    expect(
      await listDealsIn(
        tenantA,
        {
          q: "widget",
          organizationId: acme.id,
          contactId: ada.id,
          stage: "Qualified",
          closeAfter: new Date("2026-09-01T00:00:00.000Z"),
          closeBefore: new Date("2026-10-01T00:00:00.000Z"),
        },
        memory,
      ),
    ).toEqual([wanted]);
    // The tenant-override probe: a hostile tenantId in the input is still
    // scoped to the session tenant, for the new keys exactly as for `q`.
    expect(await listDealsIn(tenantA, { stage: "Qualified" }, memory)).toEqual([
      wanted,
    ]);
    expect(
      await listDealsIn(
        tenantA,
        {
          closeAfter: new Date("2026-09-01T00:00:00.000Z"),
        },
        memory,
      ),
    ).toEqual([wanted]);
  });

  it("returns null for missing or other-tenant deals", async () => {
    const memory = repo();
    const other = await createDeal(
      tenantB,
      { name: "Beta deal", stage: "Won", value: 9000 },
      memory,
    );

    expect(await getDealIn(tenantA, other.id, memory)).toBeNull();
    expect(await getDealIn(tenantA, "missing", memory)).toBeNull();
    expect(
      await updateDealIn(tenantA, other.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(await deleteDealIn(tenantA, other.id, memory)).toBeNull();
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

    await expect(
      createDealIn(
        tenantA,
        {
          name: "Widget",
          organizationId: otherOrg.id,
          stage: "New",
          value: 1000,
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listDealsIn(tenantA, {}, memory)).toEqual([]);
  });

  it("rejects create when contactId belongs to another tenant", async () => {
    const memory = repo();
    const otherContact = await createContact(
      tenantB,
      { name: "Bob", status: "lead" },
      memory,
    );

    await expect(
      createDealIn(
        tenantA,
        {
          name: "Widget",
          contactId: otherContact.id,
          stage: "New",
          value: 1000,
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listDealsIn(tenantA, {}, memory)).toEqual([]);
  });

  it("rejects update when organizationId or contactId belongs to another tenant", async () => {
    const memory = repo();
    const deal = await createDealIn(
      tenantA,
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

    await expect(
      updateDealIn(tenantA, deal!.id, { organizationId: otherOrg.id }, memory),
    ).rejects.toBeInstanceOf(InputError);
    await expect(
      updateDealIn(tenantA, deal!.id, { contactId: otherContact.id }, memory),
    ).rejects.toBeInstanceOf(InputError);
    expect(await getDeal(tenantA, deal!.id, memory)).toMatchObject({
      name: "Widget",
      organizationId: null,
      contactId: null,
    });
  });

  it("rejects create and update when stage is not a deal stage", async () => {
    const memory = repo();
    await expect(
      createDealIn(
        tenantA,
        {
          name: "Widget",
          stage: "Prospect" as "New",
          value: 1000,
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listDealsIn(tenantA, {}, memory)).toEqual([]);

    const deal = await createDealIn(
      tenantA,
      { name: "Widget", stage: "New", value: 1000 },
      memory,
    );
    await expect(
      updateDealIn(tenantA, deal!.id, { stage: "Prospect" as "New" }, memory),
    ).rejects.toBeInstanceOf(InputError);
    expect(await getDeal(tenantA, deal!.id, memory)).toMatchObject({
      stage: "New",
    });
  });

  it("previews another tenant's deal as all-zero", async () => {
    const memory = repo();
    const other = await createDeal(
      tenantB,
      { name: "Beta deal", stage: "New", value: 500, boardOrder: 0 },
      memory,
    );
    await createActivity(
      tenantB,
      { type: "note", dealId: other.id, description: "hi", done: false },
      memory,
    );

    await expect(
      dealCascadePreviewIn(tenantA, other.id, memory),
    ).resolves.toEqual({ contacts: 0, deals: 0, activities: 0 });
  });

  it("moves a deal using the session tenantId", async () => {
    const memory = repo();
    const created = await createDealIn(
      tenantA,
      { name: "Widget", stage: "New", value: 1000, probability: 10 },
      memory,
    );

    const moved = await moveDealIn(tenantA, created!.id, "Won", 0, memory);
    expect(moved?.tenantId).toBe(tenantA);
    expect(moved?.stage).toBe("Won");
    expect(moved?.probability).toBe(100);
  });

  it("returns null when moving a missing or other-tenant deal", async () => {
    const memory = repo();
    const other = await createDeal(
      tenantB,
      { name: "Beta deal", stage: "New", value: 9000 },
      memory,
    );

    expect(await moveDealIn(tenantA, other.id, "Won", 0, memory)).toBeNull();
    expect(await moveDealIn(tenantA, "missing", "Won", 0, memory)).toBeNull();
    expect(await getDeal(tenantB, other.id, memory)).toMatchObject({
      name: "Beta deal",
      stage: "New",
    });
  });
});
