import { describe, expect, it } from "vitest";
import {
  buildDashboard,
  followUps,
  getDashboard,
  monthKey,
  monthRange,
  monthlyRevenue,
  pipelineFunnel,
  recentActivity,
  topOrganizations,
  winLoss,
} from "./dashboard";
import {
  createActivity,
  createDeal,
  createMemoryCrmRepository,
  createOrganization,
  type Activity,
  type Deal,
  type Organization,
} from "./queries";

const tenantA = "tenant-a";
const now = new Date("2026-09-15T12:00:00.000Z");

function deal(partial: Partial<Deal> & Pick<Deal, "stage" | "value">): Deal {
  return {
    id: partial.id ?? "deal-1",
    tenantId: partial.tenantId ?? "tenant-a",
    name: partial.name ?? "Deal",
    organizationId: partial.organizationId ?? null,
    contactId: partial.contactId ?? null,
    stage: partial.stage,
    value: partial.value,
    probability: partial.probability ?? 0,
    closeDate: partial.closeDate ?? null,
    boardOrder: partial.boardOrder ?? 0,
    createdAt: partial.createdAt ?? now,
  };
}

function activity(
  partial: Partial<Activity> & Pick<Activity, "id" | "description">,
): Activity {
  return {
    id: partial.id,
    tenantId: partial.tenantId ?? "tenant-a",
    type: partial.type ?? "note",
    contactId: partial.contactId ?? null,
    dealId: partial.dealId ?? null,
    description: partial.description,
    occurredAt: partial.occurredAt ?? null,
    dueDate: partial.dueDate ?? null,
    done: partial.done ?? false,
    createdAt: partial.createdAt ?? now,
  };
}

function org(
  partial: Partial<Organization> & Pick<Organization, "id" | "name">,
): Organization {
  return {
    id: partial.id,
    tenantId: partial.tenantId ?? "tenant-a",
    name: partial.name,
    website: partial.website ?? null,
    industry: partial.industry ?? null,
    notes: partial.notes ?? null,
    createdAt: partial.createdAt ?? now,
  };
}

describe("monthKey", () => {
  it("returns UTC YYYY-MM", () => {
    expect(monthKey(new Date("2026-09-15T00:00:00.000Z"))).toBe("2026-09");
    expect(monthKey(new Date("2026-01-01T23:00:00.000Z"))).toBe("2026-01");
  });
});

describe("monthRange", () => {
  it("returns 12 UTC months oldest first with en-US short labels", () => {
    const months = monthRange(now);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ key: "2026-04", label: "Apr", future: false });
    expect(months[5]).toEqual({ key: "2026-09", label: "Sep", future: false });
    expect(months[6]).toEqual({ key: "2026-10", label: "Oct", future: true });
    expect(months[11]).toEqual({ key: "2027-03", label: "Mar", future: true });
  });
});

describe("monthlyRevenue", () => {
  it("sums Won actuals, open expected, and treats Lost as non-volume", () => {
    const months = monthRange(now);
    const points = monthlyRevenue(
      [
        deal({
          stage: "Won",
          value: 8000,
          probability: 100,
          closeDate: new Date("2026-09-10T00:00:00.000Z"),
        }),
        deal({
          id: "open-sep",
          stage: "Proposal",
          value: 4000,
          probability: 50,
          closeDate: new Date("2026-09-20T00:00:00.000Z"),
        }),
        deal({
          id: "lost-sep",
          stage: "Lost",
          value: 25000,
          probability: 0,
          closeDate: new Date("2026-09-12T00:00:00.000Z"),
        }),
      ],
      months,
    );
    const sep = points.find((point) => point.key === "2026-09");
    expect(sep?.actual).toBe(8000);
    expect(sep?.expected).toBe(2000);
    expect(sep?.won).toBe(1);
    expect(sep?.count).toBe(2);
  });
});

describe("buildDashboard tiles", () => {
  it("ignores a Won deal dated next month on trailing tiles", () => {
    const dashboard = buildDashboard(
      [
        deal({
          id: "won-this-month",
          stage: "Won",
          value: 2000,
          probability: 100,
          closeDate: new Date("2026-09-02T00:00:00.000Z"),
        }),
        deal({
          id: "won-april",
          stage: "Won",
          value: 1000,
          probability: 100,
          closeDate: new Date("2026-04-15T00:00:00.000Z"),
        }),
        deal({
          id: "won-next-month",
          stage: "Won",
          value: 9999,
          probability: 100,
          closeDate: new Date("2026-10-01T00:00:00.000Z"),
        }),
        deal({
          id: "won-too-old",
          stage: "Won",
          value: 8888,
          probability: 100,
          closeDate: new Date("2026-03-01T00:00:00.000Z"),
        }),
        deal({
          id: "open",
          stage: "New",
          value: 10000,
          probability: 10,
        }),
      ],
      [],
      [],
      now,
    );

    expect(dashboard.tiles.dealsWon).toBe(2);
    expect(dashboard.tiles.revenueWon).toBe(3000);
    expect(
      dashboard.monthly.find((point) => point.key === "2026-10")?.actual,
    ).toBe(9999);
  });

  it("sets expected revenue to value * probability / 100 for open deals", () => {
    const dashboard = buildDashboard(
      [
        deal({
          stage: "Proposal",
          value: 4000,
          probability: 50,
        }),
        deal({
          id: "won",
          stage: "Won",
          value: 8000,
          probability: 100,
          closeDate: new Date("2026-09-01T00:00:00.000Z"),
        }),
      ],
      [],
      [],
      now,
    );

    expect(dashboard.tiles.openDealCount).toBe(1);
    expect(dashboard.tiles.pipelineValue).toBe(4000);
    expect(dashboard.tiles.expectedRevenue).toBe(2000);
  });
});

describe("pipelineFunnel", () => {
  it("includes Won in the last 6 months, omits Lost, and cumulatively counts later stages in New+", () => {
    const sinceMonth = monthRange(now)[0].key;
    const funnel = pipelineFunnel(
      [
        deal({ id: "new", stage: "New", value: 1000, probability: 10 }),
        deal({
          id: "qualified",
          stage: "Qualified",
          value: 2000,
          probability: 25,
        }),
        deal({
          id: "proposal",
          stage: "Proposal",
          value: 3000,
          probability: 50,
        }),
        deal({
          id: "negotiation",
          stage: "Negotiation",
          value: 4000,
          probability: 75,
        }),
        deal({
          id: "won-in-window",
          stage: "Won",
          value: 5000,
          probability: 100,
          closeDate: new Date("2026-04-01T00:00:00.000Z"),
        }),
        deal({
          id: "lost",
          stage: "Lost",
          value: 9999,
          probability: 0,
          closeDate: new Date("2026-09-01T00:00:00.000Z"),
        }),
        deal({
          id: "won-too-old",
          stage: "Won",
          value: 1111,
          probability: 100,
          closeDate: new Date("2026-03-01T00:00:00.000Z"),
        }),
        deal({
          id: "won-no-close",
          stage: "Won",
          value: 2222,
          probability: 100,
          closeDate: null,
        }),
      ],
      sinceMonth,
    );

    expect(funnel.map((row) => row.label)).toEqual([
      "New+",
      "Qualified+",
      "Proposal+",
      "Negotiation+",
      "Won",
    ]);
    expect(funnel[0]).toMatchObject({
      count: 5,
      value: 15000,
      inStage: 1,
    });
    expect(funnel[4]).toMatchObject({
      label: "Won",
      count: 1,
      value: 5000,
      inStage: 1,
    });
  });
});

describe("winLoss", () => {
  it("only includes closed deals in the trailing window", () => {
    const sinceMonth = monthRange(now)[0].key;
    expect(
      winLoss(
        [
          deal({
            id: "won-in-window",
            stage: "Won",
            value: 5000,
            probability: 100,
            closeDate: new Date("2026-04-01T00:00:00.000Z"),
          }),
          deal({
            id: "lost-in-window",
            stage: "Lost",
            value: 15000,
            probability: 0,
            closeDate: new Date("2026-09-01T00:00:00.000Z"),
          }),
          deal({
            id: "won-too-old",
            stage: "Won",
            value: 8000,
            probability: 100,
            closeDate: new Date("2026-03-01T00:00:00.000Z"),
          }),
          deal({
            id: "open",
            stage: "Negotiation",
            value: 4000,
            probability: 75,
          }),
        ],
        sinceMonth,
      ),
    ).toEqual({
      rate: 50,
      wonValue: 5000,
      lostValue: 15000,
    });
  });
});

describe("topOrganizations", () => {
  it("ranks open pipeline by org name and drops deals without an organization", () => {
    const ranked = topOrganizations(
      [
        deal({
          id: "acme-a",
          stage: "New",
          value: 5000,
          organizationId: "org-acme",
        }),
        deal({
          id: "acme-b",
          stage: "Proposal",
          value: 3000,
          organizationId: "org-acme",
        }),
        deal({
          id: "beta",
          stage: "Qualified",
          value: 4000,
          organizationId: "org-beta",
        }),
        deal({
          id: "acme-won",
          stage: "Won",
          value: 99999,
          organizationId: "org-acme",
          closeDate: new Date("2026-09-01T00:00:00.000Z"),
        }),
        deal({
          id: "no-org",
          stage: "New",
          value: 7000,
          organizationId: null,
        }),
      ],
      new Map([
        ["org-acme", "Acme"],
        ["org-beta", "Beta"],
      ]),
    );

    expect(ranked).toEqual([
      { name: "Acme", value: 8000 },
      { name: "Beta", value: 4000 },
    ]);
  });
});

describe("followUps", () => {
  it("splits overdue vs upcoming on UTC date-only and excludes done", () => {
    const today = new Date("2026-09-07T15:00:00.000Z");
    const overdue = activity({
      id: "overdue",
      description: "Late call",
      dueDate: new Date("2026-09-06T23:59:59.000Z"),
    });
    const sameDay = activity({
      id: "today",
      description: "Due today",
      dueDate: new Date("2026-09-07T00:00:00.000Z"),
    });
    const upcoming = activity({
      id: "upcoming",
      description: "Next week",
      dueDate: new Date("2026-09-08T00:00:00.000Z"),
    });
    const done = activity({
      id: "done",
      description: "Finished",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      done: true,
    });
    const noDue = activity({
      id: "no-due",
      description: "Note",
    });

    expect(followUps([upcoming, done, noDue, sameDay, overdue], today)).toEqual(
      {
        overdue: [overdue],
        upcoming: [sameDay, upcoming],
      },
    );
  });
});

describe("recentActivity", () => {
  it("slices an already newest-first list", () => {
    const activities = Array.from({ length: 10 }, (_, index) =>
      activity({
        id: `a${index}`,
        description: `Note ${index}`,
      }),
    );
    expect(recentActivity(activities).map((row) => row.id)).toEqual(
      activities.slice(0, 8).map((row) => row.id),
    );
  });
});

describe("getDashboard", () => {
  it("does not include other tenant data when using a memory repo", async () => {
    const repo = createMemoryCrmRepository();
    const acme = await createOrganization(tenantA, { name: "Acme" }, repo);
    await createOrganization("tenant-b", { name: "Other Co" }, repo);
    await createDeal(
      tenantA,
      {
        name: "A deal",
        organizationId: acme.id,
        stage: "New",
        value: 1000,
        probability: 10,
      },
      repo,
    );
    await createDeal(
      "tenant-b",
      {
        name: "B deal",
        stage: "Won",
        value: 50000,
        probability: 100,
        closeDate: new Date("2026-09-01T00:00:00.000Z"),
      },
      repo,
    );
    await createActivity(
      tenantA,
      {
        type: "note",
        description: "A note",
        occurredAt: now,
        done: false,
      },
      repo,
    );
    await createActivity(
      "tenant-b",
      {
        type: "note",
        description: "Secret note",
        occurredAt: now,
        done: false,
      },
      repo,
    );

    const dashboard = await getDashboard(tenantA, repo, now);

    expect(dashboard.tiles.openDealCount).toBe(1);
    expect(dashboard.tiles.pipelineValue).toBe(1000);
    expect(dashboard.tiles.revenueWon).toBe(0);
    expect(dashboard.topOrganizations).toEqual([{ name: "Acme", value: 1000 }]);
    expect(dashboard.recentActivity.map((row) => row.description)).toEqual([
      "A note",
    ]);
  });
});
