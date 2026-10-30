import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { InputError, toResult } from "../input/result";
import {
  contactCascadePreviewIn,
  createContactIn,
  deleteContactIn,
  getContactIn,
  listContactsIn,
  updateContactIn,
} from "./contact-ops";
import {
  createActivity,
  createContact,
  createDeal,
  createMemoryCrmStore,
  createOrganization,
  DuplicateContactEmailError,
  duplicateEmailFailure,
  getContact,
  type Contact,
  type ContactResult,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmStore();
}

function unwrap(result: ContactResult): Contact {
  if (!result.ok) {
    throw new Error("expected a successful contact save");
  }
  return result.value;
}

/**
 * What the action answers with: the plain call run through the same mapper the
 * `"use server"` wrapper uses, without the session.
 */
function saving(work: () => Promise<Contact | null>) {
  return toResult(work, duplicateEmailFailure);
}

describe("contact session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = repo();
    const org = await createOrganization(tenantA, { name: "Acme" }, memory);
    const created = unwrap(
      await saving(() =>
        createContactIn(
          tenantA,
          {
            name: "Ada Lovelace",
            email: "ada@acme.test",
            jobTitle: "Analyst",
            organizationId: org.id,
            status: "lead",
          },
          memory,
        ),
      ),
    );

    expect(created?.tenantId).toBe(tenantA);
    expect(created?.name).toBe("Ada Lovelace");
    expect(created?.organizationId).toBe(org.id);
    expect(await getContact(tenantB, created!.id, memory)).toBeNull();

    expect(await listContactsIn(tenantA, {}, memory)).toEqual([created]);
    expect(await getContactIn(tenantA, created!.id, memory)).toEqual(created);

    const updated = unwrap(
      await saving(() =>
        updateContactIn(tenantA, created!.id, { status: "qualified" }, memory),
      ),
    );
    expect(updated?.status).toBe("qualified");
    expect(updated?.tenantId).toBe(tenantA);
    expect(updated?.name).toBe("Ada Lovelace");

    const deleted = await deleteContactIn(tenantA, created!.id, memory);
    expect(deleted?.id).toBe(created!.id);
    expect(await getContactIn(tenantA, created!.id, memory)).toBeNull();
  });

  it("lists with search and status against the session tenant only", async () => {
    const memory = repo();
    const ada = unwrap(
      await saving(() =>
        createContactIn(
          tenantA,
          { name: "Ada Lovelace", email: "ada@acme.test", status: "lead" },
          memory,
        ),
      ),
    );
    await saving(() =>
      createContactIn(
        tenantA,
        { name: "Bob Martin", status: "qualified" },
        memory,
      ),
    );
    await createContact(tenantB, { name: "Ada East", status: "lead" }, memory);

    expect(await listContactsIn(tenantA, { q: "ada" }, memory)).toEqual([ada]);
    expect(await listContactsIn(tenantA, { status: "lead" }, memory)).toEqual([
      ada,
    ]);
  });

  it("returns null for missing or other-tenant contacts", async () => {
    const memory = repo();
    const other = await createContact(
      tenantB,
      { name: "Bob", status: "customer" },
      memory,
    );

    expect(await getContactIn(tenantA, other.id, memory)).toBeNull();
    expect(await getContactIn(tenantA, "missing", memory)).toBeNull();
    expect(
      await updateContactIn(tenantA, other.id, { name: "Hacked" }, memory),
    ).toBeNull();
    expect(await deleteContactIn(tenantA, other.id, memory)).toBeNull();
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

    await expect(
      createContactIn(
        tenantA,
        {
          name: "Ada",
          organizationId: otherOrg.id,
          status: "lead",
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listContactsIn(tenantA, {}, memory)).toEqual([]);
  });

  it("rejects create and update when status is not a contact status", async () => {
    const memory = repo();
    const created = await saving(() =>
      createContactIn(
        tenantA,
        {
          name: "Ada",
          status: "prospect" as "lead",
        },
        memory,
      ),
    );
    expect(created).toEqual({ ok: false, code: "invalid", field: "status" });
    expect(await listContactsIn(tenantA, {}, memory)).toEqual([]);

    const lead = unwrap(
      await saving(() =>
        createContactIn(tenantA, { name: "Ada", status: "lead" }, memory),
      ),
    );
    await expect(
      updateContactIn(
        tenantA,
        lead!.id,
        { status: "prospect" as "lead" },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await getContact(tenantA, lead!.id, memory)).toMatchObject({
      status: "lead",
    });
  });

  it("previews another tenant's contact as all-zero", async () => {
    const memory = repo();
    const other = await createContact(
      tenantB,
      { name: "Bea", status: "lead" },
      memory,
    );
    await createDeal(
      tenantB,
      {
        name: "Beta deal",
        contactId: other.id,
        stage: "New",
        value: 500,
        boardOrder: 0,
      },
      memory,
    );
    await createActivity(
      tenantB,
      { type: "note", contactId: other.id, description: "hi", done: false },
      memory,
    );

    await expect(
      contactCascadePreviewIn(tenantA, other.id, memory),
    ).resolves.toEqual({ contacts: 0, deals: 0, activities: 0 });
  });
});

describe("contact duplicate-email results", () => {
  it("returns the taken contact for a same-tenant case-variant create", async () => {
    const memory = repo();
    const ana = unwrap(
      await saving(() =>
        createContactIn(
          tenantA,
          { name: "Ana Ruiz", email: "Ana@x.test", status: "lead" },
          memory,
        ),
      ),
    );

    const result = await saving(() =>
      createContactIn(
        tenantA,
        { name: "Ana Clone", email: "ana@X.test", status: "lead" },
        memory,
      ),
    );
    expect(result).toEqual({
      ok: false,
      code: "duplicate_email",
      existing: { id: ana.id, name: "Ana Ruiz", email: "Ana@x.test" },
    });
  });

  it("accepts the same address in another tenant with no existing key", async () => {
    const memory = repo();
    await saving(() =>
      createContactIn(
        tenantA,
        { name: "Ana A", email: "ana@x.test", status: "lead" },
        memory,
      ),
    );

    const result = await saving(() =>
      createContactIn(
        tenantB,
        { name: "Ana B", email: "ANA@X.TEST", status: "lead" },
        memory,
      ),
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
      await saving(() =>
        createContactIn(
          tenantA,
          { name: "Ana", email: "ana@x.test", status: "lead" },
          memory,
        ),
      ),
    );
    const bob = unwrap(
      await saving(() =>
        createContactIn(
          tenantA,
          { name: "Bob", email: "bob@x.test", status: "lead" },
          memory,
        ),
      ),
    );

    const refused = await saving(() =>
      updateContactIn(tenantA, bob.id, { email: "ANA@x.test" }, memory),
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
      await saving(() =>
        createContactIn(
          tenantA,
          { name: "Ana", email: "ANA@x.test", status: "lead" },
          memory,
        ),
      ),
    );

    const result = await saving(() =>
      updateContactIn(
        tenantA,
        ana.id,
        { email: "ana@x.test", jobTitle: "VP" },
        memory,
      ),
    );
    expect(result.ok).toBe(true);
    expect(result.ok ? result.value : null).toMatchObject({
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
    expect(source).toMatch(/if \(saved\.ok\) \{[\s\S]*?router\.refresh\(\);/);
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
