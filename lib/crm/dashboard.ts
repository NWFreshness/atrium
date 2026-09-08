import { expectedValue } from "./constants";
import { isOpen } from "./pipeline-metrics";
import {
  listActivities,
  listDeals,
  listOrganizations,
  type Activity,
  type CrmRepository,
  type Deal,
  type Organization,
} from "./queries";

export const OPEN_STAGES = [
  "New",
  "Qualified",
  "Proposal",
  "Negotiation",
] as const;

const FUNNEL_STAGES = [...OPEN_STAGES, "Won"] as const;
const MONTHS_BACK = 5;
const MONTHS_FORWARD = 6;
const TRAILING_MONTHS = MONTHS_BACK + 1;

export type Month = {
  key: string;
  label: string;
  future: boolean;
};

export type MonthlyRevenue = Month & {
  actual: number;
  expected: number;
  won: number;
  count: number;
};

export type FunnelStage = {
  stage: (typeof FUNNEL_STAGES)[number];
  label: string;
  value: number;
  count: number;
  inStage: number;
};

export type WinLoss = {
  rate: number;
  wonValue: number;
  lostValue: number;
};

export type TopOrganization = {
  name: string;
  value: number;
};

export type DashboardTiles = {
  openDealCount: number;
  pipelineValue: number;
  expectedRevenue: number;
  dealsWon: number;
  revenueWon: number;
};

export type Dashboard = {
  months: Month[];
  monthly: MonthlyRevenue[];
  tiles: DashboardTiles;
  funnel: FunnelStage[];
  winLoss: WinLoss;
  topOrganizations: TopOrganization[];
  followUps: { overdue: Activity[]; upcoming: Activity[] };
  recentActivity: Activity[];
};

export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function closeMonthKey(date: Date | null): string {
  return date ? monthKey(date) : "";
}

function utcDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function monthRange(from: Date, back = 5, forward = 6): Month[] {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const months: Month[] = [];
  for (let i = -back; i <= forward; i++) {
    const date = new Date(Date.UTC(year, month + i, 1));
    months.push({
      key: monthKey(date),
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
      future: i > 0,
    });
  }
  return months;
}

export function monthlyRevenue(
  deals: Deal[],
  months: Month[],
): MonthlyRevenue[] {
  return months.map((month) => {
    const inMonth = deals.filter(
      (deal) => closeMonthKey(deal.closeDate) === month.key,
    );
    const wonDeals = inMonth.filter((deal) => deal.stage === "Won");
    const openDeals = inMonth.filter(isOpen);
    return {
      ...month,
      actual: wonDeals.reduce((total, deal) => total + deal.value, 0),
      expected: openDeals.reduce(
        (total, deal) => total + expectedValue(deal),
        0,
      ),
      won: wonDeals.length,
      count: wonDeals.length + openDeals.length,
    };
  });
}

export function pipelineFunnel(
  deals: Deal[],
  sinceMonth: string,
): FunnelStage[] {
  const live = deals.filter(
    (deal) =>
      isOpen(deal) ||
      (deal.stage === "Won" && closeMonthKey(deal.closeDate) >= sinceMonth),
  );
  return FUNNEL_STAGES.map((stage, index) => {
    const reached = live.filter(
      (deal) =>
        (FUNNEL_STAGES as readonly string[]).indexOf(deal.stage) >= index,
    );
    return {
      stage,
      label: stage === "Won" ? "Won" : `${stage}+`,
      value: reached.reduce((total, deal) => total + deal.value, 0),
      count: reached.length,
      inStage: live.filter((deal) => deal.stage === stage).length,
    };
  });
}

export function winLoss(deals: Deal[], sinceMonth: string): WinLoss {
  const closed = deals.filter(
    (deal) =>
      (deal.stage === "Won" || deal.stage === "Lost") &&
      closeMonthKey(deal.closeDate) >= sinceMonth,
  );
  const won = closed.filter((deal) => deal.stage === "Won");
  const lost = closed.filter((deal) => deal.stage === "Lost");
  return {
    rate: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
    wonValue: won.reduce((total, deal) => total + deal.value, 0),
    lostValue: lost.reduce((total, deal) => total + deal.value, 0),
  };
}

export function topOrganizations(
  deals: Deal[],
  orgName: Map<string, string>,
  limit = 5,
): TopOrganization[] {
  const byName = new Map<string, number>();
  for (const deal of deals) {
    if (!isOpen(deal) || !deal.organizationId) {
      continue;
    }
    const name = orgName.get(deal.organizationId);
    if (!name) {
      continue;
    }
    byName.set(name, (byName.get(name) ?? 0) + deal.value);
  }
  return [...byName.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function followUps(
  activities: Activity[],
  today: Date,
): { overdue: Activity[]; upcoming: Activity[] } {
  const todayKey = utcDateOnly(today);
  const pending = activities
    .filter((activity) => activity.dueDate != null && !activity.done)
    .sort((a, b) => {
      const byDate = a.dueDate!.getTime() - b.dueDate!.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  return {
    overdue: pending.filter(
      (activity) => utcDateOnly(activity.dueDate!) < todayKey,
    ),
    upcoming: pending.filter(
      (activity) => utcDateOnly(activity.dueDate!) >= todayKey,
    ),
  };
}

export function recentActivity(activities: Activity[], limit = 8): Activity[] {
  return activities.slice(0, limit);
}

export function buildDashboard(
  deals: Deal[],
  activities: Activity[],
  orgs: Organization[],
  now: Date,
): Dashboard {
  const months = monthRange(now, MONTHS_BACK, MONTHS_FORWARD);
  const monthly = monthlyRevenue(deals, months);
  const trailing = monthly.slice(0, TRAILING_MONTHS);
  const openDeals = deals.filter(isOpen);
  const orgName = new Map(
    orgs.map((organization) => [organization.id, organization.name]),
  );
  return {
    months,
    monthly,
    tiles: {
      openDealCount: openDeals.length,
      pipelineValue: openDeals.reduce((total, deal) => total + deal.value, 0),
      expectedRevenue: openDeals.reduce(
        (total, deal) => total + expectedValue(deal),
        0,
      ),
      dealsWon: trailing.reduce((total, month) => total + month.won, 0),
      revenueWon: trailing.reduce((total, month) => total + month.actual, 0),
    },
    funnel: pipelineFunnel(deals, months[0].key),
    winLoss: winLoss(deals, months[0].key),
    topOrganizations: topOrganizations(deals, orgName, 5),
    followUps: followUps(activities, now),
    recentActivity: recentActivity(activities),
  };
}

export async function getDashboard(
  tenantId: string,
  repo?: CrmRepository,
  now?: Date,
): Promise<Dashboard> {
  const [deals, activities, orgs] = await Promise.all([
    listDeals(tenantId, repo),
    listActivities(tenantId, repo),
    listOrganizations(tenantId, repo),
  ]);
  return buildDashboard(deals, activities, orgs, now ?? new Date());
}
