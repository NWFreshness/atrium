import { describe, expect, it } from "vitest";
import {
  createInteraction,
  createMemoryRolodexRepository,
  createPerson,
  getPerson,
  listPeople,
  updatePerson,
} from "./queries";
import { circleColumnStats, movePersonCircle } from "./move-person";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("movePersonCircle", () => {
  it("returns null for a missing or other-tenant person", async () => {
    const memory = createMemoryRolodexRepository();
    const other = await createPerson(tenantB, { name: "Other" }, memory);
    expect(
      await movePersonCircle(tenantA, "missing", "inner", memory),
    ).toBeNull();
    expect(
      await movePersonCircle(tenantA, other.id, "inner", memory),
    ).toBeNull();
  });

  it("changes circle and recomputes status from the new cadence", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(
      tenantA,
      { name: "Maya Chen", circle: "inner" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: person.id, type: "call", date: "2026-01-01" },
      memory,
    );
    const moved = await movePersonCircle(tenantA, person.id, "distant", memory);
    expect(moved?.circle).toBe("distant");
    expect((await getPerson(tenantA, person.id, memory))?.circle).toBe(
      "distant",
    );
    expect(moved?.status).toBe("in_touch");
  });

  it("is a no-op when the circle does not change", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(
      tenantA,
      { name: "Sam Okoye", circle: "close" },
      memory,
    );
    const moved = await movePersonCircle(tenantA, person.id, "close", memory);
    expect(moved?.id).toBe(person.id);
    expect(moved?.circle).toBe("close");
  });
});

describe("status overrides", () => {
  it("turns check-ins off and snooze away from overdue", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(
      tenantA,
      { name: "Luis Andrade", circle: "inner" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: person.id, type: "call", date: "2020-01-01" },
      memory,
    );
    expect((await getPerson(tenantA, person.id, memory))?.status).toBe(
      "overdue",
    );

    await updatePerson(tenantA, person.id, { checkinsOff: true }, memory);
    expect((await getPerson(tenantA, person.id, memory))?.status).toBe("off");

    await updatePerson(
      tenantA,
      person.id,
      { checkinsOff: false, snoozedUntil: "2099-01-01" },
      memory,
    );
    expect((await getPerson(tenantA, person.id, memory))?.status).toBe(
      "snoozed",
    );
  });
});

describe("circleColumnStats", () => {
  it("counts people and overdue per circle", async () => {
    const memory = createMemoryRolodexRepository();
    const inner = await createPerson(
      tenantA,
      { name: "Overdue Inner", circle: "inner" },
      memory,
    );
    await createPerson(
      tenantA,
      { name: "Close Friend", circle: "close" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: inner.id, type: "call", date: "2020-01-01" },
      memory,
    );
    const people = await listPeople(tenantA, memory);
    const stats = circleColumnStats(people);
    expect(stats.find((row) => row.circle === "inner")).toEqual({
      circle: "inner",
      count: 1,
      overdue: 1,
    });
    expect(stats.find((row) => row.circle === "close")?.count).toBe(1);
    expect(stats.find((row) => row.circle === "close")?.overdue).toBe(0);
  });
});
