/**
 * These cases used to live in `move-person.test.ts`, next to `movePersonCircle`.
 * The function moved because `circles-board.tsx` is a client component, and a
 * client component may not reach `queries.ts` — see `lib/client-boundary.test.ts`
 * for the gate that keeps it that way.
 */
import { describe, expect, it } from "vitest";
import { circleColumnStats } from "./circle-stats";
import {
  createInteraction,
  createMemoryRolodexRepository,
  createPerson,
  listPeople,
} from "./queries";

const tenantA = "tenant-a";

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
