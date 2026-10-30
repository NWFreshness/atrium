import { describe, expect, it } from "vitest";
import { getDashboardIn } from "./dashboard-ops";
import { createMemoryRolodexStore, createPerson } from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const today = "2026-03-20";

describe("getDashboardIn", () => {
  it("uses the session tenant and ignores a client tenantId", async () => {
    const memory = createMemoryRolodexStore();
    await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    await createPerson(tenantB, { name: "Other Tenant" }, memory);

    const dashboard = await getDashboardIn(tenantA, memory, today);

    expect(dashboard.whoToContact.map((row) => row.name)).toEqual([
      "Sam Rivera",
    ]);
  });
});
