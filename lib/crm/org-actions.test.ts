import { describe, expect, it } from "vitest";
import {
  createOrganizationForSession,
  deleteOrganizationForSession,
  getOrganizationForSession,
  listOrganizationsForSession,
  updateOrganizationForSession,
} from "./org-actions";
import {
  createMemoryCrmRepository,
  createOrganization,
  getOrganization,
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

describe("org session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const created = await createOrganizationForSession(
      getSessionA,
      {
        name: "Acme",
        website: "https://acme.test",
        industry: "Widgets",
        notes: "VIP",
        tenantId: tenantB,
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(created.name).toBe("Acme");
    expect(await getOrganization(tenantB, created.id, memory)).toBeNull();

    expect(await listOrganizationsForSession(getSessionA, {}, memory)).toEqual([
      created,
    ]);
    expect(
      await getOrganizationForSession(getSessionA, created.id, memory),
    ).toEqual(created);

    const updated = await updateOrganizationForSession(
      getSessionA,
      created.id,
      { name: "Acme Inc", tenantId: tenantB },
      memory,
    );
    expect(updated?.name).toBe("Acme Inc");
    expect(updated?.tenantId).toBe(tenantA);

    const deleted = await deleteOrganizationForSession(
      getSessionA,
      created.id,
      memory,
    );
    expect(deleted?.id).toBe(created.id);
    expect(
      await getOrganizationForSession(getSessionA, created.id, memory),
    ).toBeNull();
  });

  it("lists with search against the session tenant only", async () => {
    const memory = repo();
    const acme = await createOrganizationForSession(
      getSessionA,
      { name: "Acme" },
      memory,
    );
    await createOrganizationForSession(
      getSessionA,
      { name: "Bluepeak Software" },
      memory,
    );
    await createOrganization(tenantB, { name: "Acme East" }, memory);

    expect(
      await listOrganizationsForSession(
        getSessionA,
        { q: "acme", tenantId: tenantB },
        memory,
      ),
    ).toEqual([acme]);
  });

  it("returns null for missing or other-tenant organizations", async () => {
    const memory = repo();
    const other = await createOrganization(
      tenantB,
      { name: "Beta Co" },
      memory,
    );

    expect(
      await getOrganizationForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(
      await getOrganizationForSession(getSessionA, "missing", memory),
    ).toBeNull();
    expect(
      await updateOrganizationForSession(
        getSessionA,
        other.id,
        { name: "Hacked" },
        memory,
      ),
    ).toBeNull();
    expect(
      await deleteOrganizationForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(await getOrganization(tenantB, other.id, memory)).toMatchObject({
      name: "Beta Co",
    });
  });

  it("throws when unauthenticated", async () => {
    const memory = repo();
    await expect(
      createOrganizationForSession(async () => null, { name: "Acme" }, memory),
    ).rejects.toThrow("Unauthenticated");
  });
});
