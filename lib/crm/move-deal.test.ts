import { describe, expect, it } from "vitest";
import { moveDeal } from "./move-deal";
import { sumExpected, sumValue } from "./pipeline-metrics";
import {
  createDeal,
  createMemoryCrmRepository,
  getDeal,
  listDeals,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmRepository();
}

describe("moveDeal", () => {
  it("returns null when the deal is missing", async () => {
    const memory = repo();
    expect(await moveDeal(tenantA, "missing", "New", 0, memory)).toBeNull();
  });

  it("returns null when another tenant tries to move the deal", async () => {
    const memory = repo();
    const other = await createDeal(
      tenantB,
      { name: "Beta deal", stage: "New", value: 9000, probability: 10 },
      memory,
    );

    expect(await moveDeal(tenantA, other.id, "Won", 0, memory)).toBeNull();
    expect(await getDeal(tenantB, other.id, memory)).toMatchObject({
      stage: "New",
      probability: 10,
      boardOrder: 0,
    });
  });

  it("rebases probability to 100 when moving to Won", async () => {
    const memory = repo();
    const deal = await createDeal(
      tenantA,
      {
        name: "Widget",
        stage: "Negotiation",
        value: 1000,
        probability: 80,
      },
      memory,
    );

    const moved = await moveDeal(tenantA, deal.id, "Won", 0, memory);
    expect(moved?.stage).toBe("Won");
    expect(moved?.probability).toBe(100);
  });

  it("rebases probability to 0 when moving to Lost", async () => {
    const memory = repo();
    const deal = await createDeal(
      tenantA,
      {
        name: "Widget",
        stage: "Proposal",
        value: 1000,
        probability: 50,
      },
      memory,
    );

    const moved = await moveDeal(tenantA, deal.id, "Lost", 0, memory);
    expect(moved?.stage).toBe("Lost");
    expect(moved?.probability).toBe(0);
  });

  it("does not rebase a custom probability on same-column reorder", async () => {
    const memory = repo();
    const first = await createDeal(
      tenantA,
      {
        name: "First",
        stage: "Proposal",
        value: 1000,
        probability: 50,
        boardOrder: 0,
      },
      memory,
    );
    const custom = await createDeal(
      tenantA,
      {
        name: "Custom",
        stage: "Proposal",
        value: 2000,
        probability: 40,
        boardOrder: 1,
      },
      memory,
    );

    const moved = await moveDeal(tenantA, custom.id, "Proposal", 0, memory);
    expect(moved?.stage).toBe("Proposal");
    expect(moved?.probability).toBe(40);
    expect(moved?.boardOrder).toBe(0);
    expect(await getDeal(tenantA, first.id, memory)).toMatchObject({
      boardOrder: 1,
      probability: 50,
    });
  });

  it("places the deal at index and rewrites boardOrder 0..n-1 in the target column", async () => {
    const memory = repo();
    const a = await createDeal(
      tenantA,
      { name: "A", stage: "New", value: 1, boardOrder: 0 },
      memory,
    );
    const b = await createDeal(
      tenantA,
      { name: "B", stage: "New", value: 1, boardOrder: 1 },
      memory,
    );
    const c = await createDeal(
      tenantA,
      { name: "C", stage: "New", value: 1, boardOrder: 2 },
      memory,
    );
    await createDeal(
      tenantA,
      { name: "Other stage", stage: "Qualified", value: 1, boardOrder: 0 },
      memory,
    );
    await createDeal(
      tenantB,
      { name: "Other tenant", stage: "New", value: 1, boardOrder: 0 },
      memory,
    );

    await moveDeal(tenantA, c.id, "New", 0, memory);

    const column = (await listDeals(tenantA, memory))
      .filter((row) => row.stage === "New")
      .sort((left, right) => left.boardOrder - right.boardOrder);
    expect(column.map((row) => row.id)).toEqual([c.id, a.id, b.id]);
    expect(column.map((row) => row.boardOrder)).toEqual([0, 1, 2]);
  });

  it("inserts at the end of the target column when index is omitted", async () => {
    const memory = repo();
    const existing = await createDeal(
      tenantA,
      { name: "Existing", stage: "Qualified", value: 1, boardOrder: 0 },
      memory,
    );
    const incoming = await createDeal(
      tenantA,
      { name: "Incoming", stage: "New", value: 1, boardOrder: 0 },
      memory,
    );

    const moved = await moveDeal(
      tenantA,
      incoming.id,
      "Qualified",
      undefined,
      memory,
    );
    expect(moved?.stage).toBe("Qualified");
    expect(moved?.boardOrder).toBe(1);
    expect(await getDeal(tenantA, existing.id, memory)).toMatchObject({
      boardOrder: 0,
    });
  });

  it("does not write when stage and index are unchanged", async () => {
    const memory = repo();
    const first = await createDeal(
      tenantA,
      { name: "First", stage: "New", value: 1, boardOrder: 0 },
      memory,
    );
    const second = await createDeal(
      tenantA,
      { name: "Second", stage: "New", value: 1, boardOrder: 1 },
      memory,
    );
    const before = memory.deals.map((row) => ({ ...row }));

    const moved = await moveDeal(tenantA, second.id, "New", 1, memory);
    expect(moved).toMatchObject({
      id: second.id,
      stage: "New",
      boardOrder: 1,
    });
    expect(memory.deals).toEqual(before);
    expect(await getDeal(tenantA, first.id, memory)).toMatchObject({
      boardOrder: 0,
    });
  });

  it("drops open-pipeline totals when a deal moves to Won or Lost", async () => {
    const memory = repo();
    const open = await createDeal(
      tenantA,
      {
        name: "Open",
        stage: "New",
        value: 1000,
        probability: 10,
      },
      memory,
    );
    const leaving = await createDeal(
      tenantA,
      {
        name: "Leaving",
        stage: "Proposal",
        value: 4000,
        probability: 50,
      },
      memory,
    );

    const before = await listDeals(tenantA, memory);
    expect(sumValue(before)).toBe(5000);
    expect(sumExpected(before)).toBe(2100);

    await moveDeal(tenantA, leaving.id, "Won", 0, memory);

    const after = await listDeals(tenantA, memory);
    expect(sumValue(after)).toBe(1000);
    expect(sumExpected(after)).toBe(100);
    expect(await getDeal(tenantA, open.id, memory)).toMatchObject({
      stage: "New",
    });
  });
});
