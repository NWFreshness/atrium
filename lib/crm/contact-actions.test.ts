import { describe, expect, it } from "vitest";
import {
  createContactForSession,
  deleteContactForSession,
  getContactForSession,
  listContactsForSession,
  updateContactForSession,
} from "./contact-actions";
import {
  createContact,
  createMemoryCrmRepository,
  createOrganization,
  getContact,
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

describe("contact session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const created = await createContactForSession(
      getSessionA,
      {
        name: "Ada Lovelace",
        email: "ada@acme.test",
        jobTitle: "Analyst",
        organizationId: org.id,
        status: "lead",
        tenantId: tenantB,
      },
      memory,
    );

    expect(created?.tenantId).toBe(tenantA);
    expect(created?.name).toBe("Ada Lovelace");
    expect(created?.organizationId).toBe(org.id);
    expect(await getContact(tenantB, created!.id, memory)).toBeNull();

    expect(await listContactsForSession(getSessionA, {}, memory)).toEqual([
      created,
    ]);
    expect(
      await getContactForSession(getSessionA, created!.id, memory),
    ).toEqual(created);

    const updated = await updateContactForSession(
      getSessionA,
      created!.id,
      { status: "qualified", tenantId: tenantB },
      memory,
    );
    expect(updated?.status).toBe("qualified");
    expect(updated?.tenantId).toBe(tenantA);
    expect(updated?.name).toBe("Ada Lovelace");

    const deleted = await deleteContactForSession(
      getSessionA,
      created!.id,
      memory,
    );
    expect(deleted?.id).toBe(created!.id);
    expect(
      await getContactForSession(getSessionA, created!.id, memory),
    ).toBeNull();
  });

  it("lists with search and status against the session tenant only", async () => {
    const memory = repo();
    const ada = await createContactForSession(
      getSessionA,
      { name: "Ada Lovelace", email: "ada@acme.test", status: "lead" },
      memory,
    );
    await createContactForSession(
      getSessionA,
      { name: "Bob Martin", status: "qualified" },
      memory,
    );
    await createContact(tenantB, { name: "Ada East", status: "lead" }, memory);

    expect(
      await listContactsForSession(
        getSessionA,
        { q: "ada", tenantId: tenantB },
        memory,
      ),
    ).toEqual([ada]);
    expect(
      await listContactsForSession(
        getSessionA,
        { status: "lead", tenantId: tenantB },
        memory,
      ),
    ).toEqual([ada]);
  });

  it("returns null for missing or other-tenant contacts", async () => {
    const memory = repo();
    const other = await createContact(
      tenantB,
      { name: "Bob", status: "customer" },
      memory,
    );

    expect(
      await getContactForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(
      await getContactForSession(getSessionA, "missing", memory),
    ).toBeNull();
    expect(
      await updateContactForSession(
        getSessionA,
        other.id,
        { name: "Hacked" },
        memory,
      ),
    ).toBeNull();
    expect(
      await deleteContactForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(await getContact(tenantB, other.id, memory)).toMatchObject({
      name: "Bob",
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
      await createContactForSession(
        getSessionA,
        {
          name: "Ada",
          organizationId: otherOrg.id,
          status: "lead",
        },
        memory,
      ),
    ).toBeNull();
    expect(await listContactsForSession(getSessionA, {}, memory)).toEqual([]);
  });

  it("rejects create and update when status is not a contact status", async () => {
    const memory = repo();
    const created = await createContactForSession(
      getSessionA,
      {
        name: "Ada",
        status: "prospect" as "lead",
      },
      memory,
    );
    expect(created).toBeNull();
    expect(await listContactsForSession(getSessionA, {}, memory)).toEqual([]);

    const lead = await createContactForSession(
      getSessionA,
      { name: "Ada", status: "lead" },
      memory,
    );
    expect(
      await updateContactForSession(
        getSessionA,
        lead!.id,
        { status: "prospect" as "lead" },
        memory,
      ),
    ).toBeNull();
    expect(await getContact(tenantA, lead!.id, memory)).toMatchObject({
      status: "lead",
    });
  });

  it("throws when unauthenticated", async () => {
    const memory = repo();
    await expect(
      createContactForSession(
        async () => null,
        { name: "Ada", status: "lead" },
        memory,
      ),
    ).rejects.toThrow("Unauthenticated");
  });
});
