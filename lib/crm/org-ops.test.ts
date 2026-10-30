import { describe, expect, it } from "vitest";
import {
  createOrganizationIn,
  deleteOrganizationIn,
  getOrganizationIn,
  listOrganizationsIn,
  organizationCascadePreviewIn,
  updateOrganizationIn,
} from "./org-ops";
import {
  createContact,
  createDeal,
  createMemoryCrmStore,
  createOrganization,
  getOrganization,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmStore();
}

describe("org session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const created = await createOrganizationIn(
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
    expect(created.name).toBe("Acme");
    expect(await getOrganization(tenantB, created.id, memory)).toBeNull();

    expect(await listOrganizationsIn(tenantA, {}, memory)).toEqual([created]);
    expect(await getOrganizationIn(tenantA, created.id, memory)).toEqual(
      created,
    );

    const updated = await updateOrganizationIn(
      tenantA,
      created.id,
      { name: "Acme Inc" },
      memory,
    );
    expect(updated?.name).toBe("Acme Inc");
    expect(updated?.tenantId).toBe(tenantA);

    const deleted = await deleteOrganizationIn(tenantA, created.id, memory);
    expect(deleted?.id).toBe(created.id);
    expect(await getOrganizationIn(tenantA, created.id, memory)).toBeNull();
  });

  it("lists with search against the session tenant only", async () => {
    const memory = repo();
    const acme = await createOrganizationIn(tenantA, { name: "Acme" }, memory);
    await createOrganizationIn(tenantA, { name: "Bluepeak Software" }, memory);
    await createOrganization(tenantB, { name: "Acme East" }, memory);

    expect(await listOrganizationsIn(tenantA, { q: "acme" }, memory)).toEqual([
      acme,
    ]);
  });

  it("returns null for missing or other-tenant organizations", async () => {
    const memory = repo();
    const other = await createOrganization(
      tenantB,
      { name: "Beta Co" },
      memory,
    );

    expect(await getOrganizationIn(tenantA, other.id, memory)).toBeNull();
    expect(await getOrganizationIn(tenantA, "missing", memory)).toBeNull();
    expect(
      await updateOrganizationIn(tenantA, other.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(await deleteOrganizationIn(tenantA, other.id, memory)).toBeNull();
    expect(await getOrganization(tenantB, other.id, memory)).toMatchObject({
      name: "Beta Co",
    });
  });

  it("previews another tenant's organization as all-zero", async () => {
    const memory = repo();
    const other = await createOrganization(
      tenantB,
      { name: "Beta Co" },
      memory,
    );
    await createContact(
      tenantB,
      { name: "Bea", organizationId: other.id, status: "lead" },
      memory,
    );
    await createDeal(
      tenantB,
      {
        name: "Beta deal",
        organizationId: other.id,
        stage: "New",
        value: 500,
        boardOrder: 0,
      },
      memory,
    );

    await expect(
      organizationCascadePreviewIn(tenantA, other.id, memory),
    ).resolves.toEqual({ contacts: 0, deals: 0, activities: 0 });
  });
});
