import { describe, expect, it } from "vitest";
import {
  createPersonForSession,
  deletePersonForSession,
  getPersonForSession,
  listPeopleForSession,
  updatePersonForSession,
} from "./person-actions";
import { createMemoryRolodexRepository, getPerson } from "./queries";

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

describe("person session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = createMemoryRolodexRepository();
    const created = await createPersonForSession(
      getSessionA,
      {
        name: "Maya Chen",
        company: "Figma",
        tenantId: tenantB,
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(await getPerson(tenantB, created.id, memory)).toBeNull();

    const listed = await listPeopleForSession(getSessionA, {}, memory);
    expect(listed.map((row) => row.name)).toEqual(["Maya Chen"]);
    expect(
      await getPersonForSession(getSessionA, created.id, memory),
    ).toMatchObject({ name: "Maya Chen", tenantId: tenantA });

    const updated = await updatePersonForSession(
      getSessionA,
      created.id,
      { name: "Maya C.", tenantId: tenantB },
      memory,
    );
    expect(updated?.name).toBe("Maya C.");
    expect(updated?.tenantId).toBe(tenantA);

    expect(await deletePersonForSession(getSessionA, created.id, memory)).toBe(
      true,
    );
    expect(
      await getPersonForSession(getSessionA, created.id, memory),
    ).toBeNull();
  });

  it("lists with search against the session tenant only", async () => {
    const memory = createMemoryRolodexRepository();
    await createPersonForSession(
      getSessionA,
      { name: "Maya Chen", company: "Figma" },
      memory,
    );
    await createPersonForSession(
      getSessionA,
      { name: "Sam Okoye", company: "Northwind" },
      memory,
    );

    const found = await listPeopleForSession(
      getSessionA,
      { q: "figma", tenantId: tenantB },
      memory,
    );
    expect(found.map((row) => row.name)).toEqual(["Maya Chen"]);
  });
});
