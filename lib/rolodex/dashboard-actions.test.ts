import { describe, expect, it } from "vitest";
import { getDashboardForSession } from "./dashboard-actions";
import { createMemoryRolodexRepository, createPerson } from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const today = "2026-03-20";

function getSessionA() {
  return Promise.resolve({
    user: { id: "user-a", tenantId: tenantA, role: "owner" as const },
  });
}

describe("getDashboardForSession", () => {
  it("uses the session tenant and ignores a client tenantId", async () => {
    const memory = createMemoryRolodexRepository();
    await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    await createPerson(tenantB, { name: "Other Tenant" }, memory);

    const dashboard = await getDashboardForSession(
      getSessionA,
      { tenantId: tenantB },
      memory,
      today,
    );

    expect(dashboard.whoToContact.map((row) => row.name)).toEqual([
      "Sam Rivera",
    ]);
  });
});
