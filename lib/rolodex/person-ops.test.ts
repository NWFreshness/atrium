import { describe, expect, it } from "vitest";
import {
  createPersonIn,
  deletePersonIn,
  getPersonIn,
  listPeopleIn,
  updatePersonIn,
} from "./person-ops";
import { createMemoryRolodexStore, getPerson } from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("person session actions", () => {
  it("creates, lists, updates, and deletes using the session tenantId", async () => {
    const memory = createMemoryRolodexStore();
    const created = await createPersonIn(
      tenantA,
      {
        name: "Maya Chen",
        company: "Figma",
      },
      memory,
    );

    expect(created.tenantId).toBe(tenantA);
    expect(await getPerson(tenantB, created.id, memory)).toBeNull();

    const listed = await listPeopleIn(tenantA, {}, memory);
    expect(listed.map((row) => row.name)).toEqual(["Maya Chen"]);
    expect(await getPersonIn(tenantA, created.id, memory)).toMatchObject({
      name: "Maya Chen",
      tenantId: tenantA,
    });

    const updated = await updatePersonIn(
      tenantA,
      created.id,
      { name: "Maya C." },
      memory,
    );
    expect(updated?.name).toBe("Maya C.");
    expect(updated?.tenantId).toBe(tenantA);

    expect(await deletePersonIn(tenantA, created.id, memory)).toBe(true);
    expect(await getPersonIn(tenantA, created.id, memory)).toBeNull();
  });

  it("lists with search against the session tenant only", async () => {
    const memory = createMemoryRolodexStore();
    await createPersonIn(
      tenantA,
      { name: "Maya Chen", company: "Figma" },
      memory,
    );
    await createPersonIn(
      tenantA,
      { name: "Sam Okoye", company: "Northwind" },
      memory,
    );

    const found = await listPeopleIn(tenantA, { q: "figma" }, memory);
    expect(found.map((row) => row.name)).toEqual(["Maya Chen"]);
  });
});
