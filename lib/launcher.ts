/**
 * The launcher's live readouts (Phase 14): what each rack unit shows next to
 * its name, and the colour of its status LED. Pure — the page fetches the three
 * per-app summaries it already has actions for and this turns them into copy.
 * Groove has no entry: it never touches the database.
 */

export type UnitStatus = "ok" | "warn" | "bad";

export type Readout = {
  label: string;
  value: string;
  tone?: "warn" | "bad";
};

export type UnitReadouts = {
  status: UnitStatus;
  readouts: Readout[];
};

/** Structural slices of the CRM dashboard, Rolodex dashboard and Space page list. */
export type LauncherInput = {
  crm: {
    tiles: { openDealCount: number; pipelineValue: number };
    followUps: { overdue: unknown[]; upcoming: unknown[] };
  };
  rolodex: {
    peoplePerCircle: { total: number; overdue: number }[];
    upcomingDates: unknown[];
    dueReminders: unknown[];
  };
  pages: { type: string }[];
};

/**
 * "$184.3K", "$1.2M", "$0". Hand-rolled on purpose: `Intl` compact notation
 * prints zero differently across Node/ICU versions, which made the figure (and
 * its test) depend on the machine.
 */
function compactMoney(n: number): string {
  const scaled = (value: number, suffix: string) =>
    `$${value.toFixed(1).replace(/\.0$/, "")}${suffix}`;
  if (n >= 1_000_000) return scaled(n / 1_000_000, "M");
  if (n >= 1_000) return scaled(n / 1_000, "K");
  return `$${Math.round(n)}`;
}

function count(label: string, n: number, tone?: Readout["tone"]): Readout {
  return tone && n > 0
    ? { label, value: String(n), tone }
    : { label, value: String(n) };
}

export function launcherReadouts(
  input: LauncherInput,
): Record<"crm" | "space" | "rolodex", UnitReadouts> {
  const overdueFollowUps = input.crm.followUps.overdue.length;
  const followUps = overdueFollowUps + input.crm.followUps.upcoming.length;
  const crmStatus: UnitStatus =
    overdueFollowUps > 0 ? "bad" : followUps > 0 ? "warn" : "ok";

  const people = input.rolodex.peoplePerCircle.reduce(
    (sum, circle) => sum + circle.total,
    0,
  );
  const overduePeople = input.rolodex.peoplePerCircle.reduce(
    (sum, circle) => sum + circle.overdue,
    0,
  );
  const dates = input.rolodex.upcomingDates.length;
  const rolodexStatus: UnitStatus =
    overduePeople > 0
      ? "bad"
      : dates > 0 || input.rolodex.dueReminders.length > 0
        ? "warn"
        : "ok";

  return {
    crm: {
      status: crmStatus,
      readouts: [
        count("Open", input.crm.tiles.openDealCount),
        {
          label: "Pipeline",
          value: compactMoney(input.crm.tiles.pipelineValue),
        },
        count(
          "Follow-ups",
          followUps,
          crmStatus === "ok" ? undefined : crmStatus,
        ),
      ],
    },
    space: {
      status: "ok",
      readouts: [
        count("Pages", input.pages.filter((p) => p.type === "page").length),
        count(
          "Databases",
          input.pages.filter((p) => p.type === "database").length,
        ),
      ],
    },
    rolodex: {
      status: rolodexStatus,
      readouts: [
        count("People", people),
        count("Overdue", overduePeople, "bad"),
        count("Dates 30d", dates),
      ],
    },
  };
}
