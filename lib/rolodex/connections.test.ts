import { describe, expect, it } from "vitest";
import { connectionViews, describeConnection } from "./connections";
import {
  createConnection,
  createMemoryRolodexRepository,
  createPerson,
  deletePerson,
  listConnections,
} from "./queries";

const tenant = "tenant-a";

async function twoPeople() {
  const memory = createMemoryRolodexRepository();
  const sam = await createPerson(tenant, { name: "Sam Rivera" }, memory);
  const kate = await createPerson(tenant, { name: "Kate Okoye" }, memory);
  return { memory, sam, kate };
}

describe("describeConnection", () => {
  it("inverts parent/child from each end", async () => {
    const { memory, sam, kate } = await twoPeople();
    const row = await createConnection(
      tenant,
      {
        personA: sam.id,
        personB: kate.id,
        kind: "parent_child",
        aIsParent: true,
      },
      memory,
    );
    expect(describeConnection(sam.id, row, kate.name)).toBe(
      "Parent of Kate Okoye",
    );
    expect(describeConnection(kate.id, row, sam.name)).toBe(
      "Child of Sam Rivera",
    );
  });

  it("uses other labels from each end", async () => {
    const { memory, sam, kate } = await twoPeople();
    const row = await createConnection(
      tenant,
      {
        personA: sam.id,
        personB: kate.id,
        kind: "other",
        label: "Mentor of Kate",
        inverseLabel: "Mentee of Sam",
      },
      memory,
    );
    expect(describeConnection(sam.id, row, kate.name)).toBe("Mentor of Kate");
    expect(describeConnection(kate.id, row, sam.name)).toBe("Mentee of Sam");
  });
});

describe("connectionViews", () => {
  it("appears on both people with the inverse description", async () => {
    const { memory, sam, kate } = await twoPeople();
    await createConnection(
      tenant,
      {
        personA: sam.id,
        personB: kate.id,
        kind: "parent_child",
        aIsParent: true,
      },
      memory,
    );
    const rows = await listConnections(tenant, memory);
    const fromSam = connectionViews(sam.id, rows, [sam, kate]);
    const fromKate = connectionViews(kate.id, rows, [sam, kate]);
    expect(fromSam[0]).toMatchObject({
      otherId: kate.id,
      otherName: "Kate Okoye",
      description: "Parent of Kate Okoye",
    });
    expect(fromKate[0]).toMatchObject({
      otherId: sam.id,
      otherName: "Sam Rivera",
      description: "Child of Sam Rivera",
    });
  });
});

describe("deletePerson cascade", () => {
  it("does not leave broken connections on the other person", async () => {
    const { memory, sam, kate } = await twoPeople();
    await createConnection(
      tenant,
      {
        personA: sam.id,
        personB: kate.id,
        kind: "partner",
      },
      memory,
    );
    expect(await deletePerson(tenant, sam.id, memory)).toBe(true);
    expect(
      await listConnections(tenant, memory, { personId: kate.id }),
    ).toEqual([]);
  });
});
