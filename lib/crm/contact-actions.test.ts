import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  DuplicateContactEmailError,
  duplicateEmailFailure,
  getContact,
  type Contact,
  type ContactCreateResult,
  type ContactUpdateResult,
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

function unwrap(
  result: ContactCreateResult | ContactUpdateResult | null,
): Contact {
  if (!result || !result.ok) {
    throw new Error("expected a successful contact save");
  }
  return result.contact;
}

describe("contact session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const created = unwrap(
      await createContactForSession(
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
      ),
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

    const updated = unwrap(
      await updateContactForSession(
        getSessionA,
        created!.id,
        { status: "qualified", tenantId: tenantB },
        memory,
      ),
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
    const ada = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Ada Lovelace", email: "ada@acme.test", status: "lead" },
        memory,
      ),
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

    const lead = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Ada", status: "lead" },
        memory,
      ),
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

const sessionB = {
  user: {
    id: "user-b",
    tenantId: tenantB,
    role: "owner" as const,
  },
};

function getSessionB() {
  return Promise.resolve(sessionB);
}

describe("contact duplicate-email results", () => {
  it("returns the taken contact for a same-tenant case-variant create", async () => {
    const memory = repo();
    const ana = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Ana Ruiz", email: "Ana@x.test", status: "lead" },
        memory,
      ),
    );

    const result = await createContactForSession(
      getSessionA,
      { name: "Ana Clone", email: "ana@X.test", status: "lead" },
      memory,
    );
    expect(result).toEqual({
      ok: false,
      code: "duplicate_email",
      existing: { id: ana.id, name: "Ana Ruiz", email: "Ana@x.test" },
    });
  });

  it("accepts the same address in another tenant with no existing key", async () => {
    const memory = repo();
    await createContactForSession(
      getSessionA,
      { name: "Ana A", email: "ana@x.test", status: "lead" },
      memory,
    );

    const result = await createContactForSession(
      getSessionB,
      { name: "Ana B", email: "ANA@X.TEST", status: "lead" },
      memory,
    );
    expect(result).toMatchObject({ ok: true });
    expect(result && "existing" in result).toBe(false);
  });

  it("maps a store-refused update to the race shape with no existing key", () => {
    expect(duplicateEmailFailure(new DuplicateContactEmailError())).toEqual({
      ok: false,
      code: "duplicate_email",
    });
  });

  it("maps a pre-check refusal to the linked shape", () => {
    expect(
      duplicateEmailFailure(
        new DuplicateContactEmailError({
          id: "c-1",
          name: "Ana Ruiz",
          email: "ana@x.test",
        }),
      ),
    ).toEqual({
      ok: false,
      code: "duplicate_email",
      existing: { id: "c-1", name: "Ana Ruiz", email: "ana@x.test" },
    });
  });

  it("refuses an update onto another contact's address with the linked shape", async () => {
    const memory = repo();
    const ana = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Ana", email: "ana@x.test", status: "lead" },
        memory,
      ),
    );
    const bob = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Bob", email: "bob@x.test", status: "lead" },
        memory,
      ),
    );

    const refused = await updateContactForSession(
      getSessionA,
      bob.id,
      { email: "ANA@x.test" },
      memory,
    );
    expect(refused).toEqual({
      ok: false,
      code: "duplicate_email",
      existing: { id: ana.id, name: "Ana", email: "ana@x.test" },
    });
  });

  it("keeps an own-address update with the contact", async () => {
    const memory = repo();
    const ana = unwrap(
      await createContactForSession(
        getSessionA,
        { name: "Ana", email: "ANA@x.test", status: "lead" },
        memory,
      ),
    );

    const result = await updateContactForSession(
      getSessionA,
      ana.id,
      { email: "ana@x.test", jobTitle: "VP" },
      memory,
    );
    expect(result?.ok).toBe(true);
    expect(result && result.ok ? result.contact : null).toMatchObject({
      id: ana.id,
      email: "ana@x.test",
      jobTitle: "VP",
    });
  });
});

describe("contact form duplicate slot", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/crm/contact-form.tsx"),
    "utf8",
  );

  it("renders the taken-address alert with the Open link inside the dialog", () => {
    expect(source).toContain('role="alert"');
    expect(source).toContain("already uses");
    expect(source).toContain("Open {taken.name}");
    expect(source).toContain("/crm/contacts/");
    expect(source).toContain("onClick={() => onClose()}");
    expect(source).toContain("aria-invalid");
    expect(source).toContain("aria-describedby");
  });

  it("shows the race fallback copy when the store refuses without a link", () => {
    expect(source).toContain(
      "Could not save that contact. That email may already be in use.",
    );
  });

  it("refreshes and closes only on the successful save", () => {
    expect(source).toMatch(/if \(saved && saved\.ok\) \{[\s\S]*?router\.refresh\(\);/);
    expect(source.match(/router\.refresh\(\);/g)).toHaveLength(1);
  });

  it("adds no store vocabulary to the client", () => {
    for (const word of [
      "duplicate",
      "unique",
      "index",
      "constraint",
      "23505",
      "lower(",
      "case-insensitive",
      "email_lower_idx",
    ]) {
      expect(source, word).not.toContain(word);
    }
  });
});
