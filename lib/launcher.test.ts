import { describe, expect, it } from "vitest";
import { launcherReadouts, type LauncherInput } from "./launcher";

function input(overrides: Partial<LauncherInput> = {}): LauncherInput {
  return {
    crm: {
      tiles: { openDealCount: 0, pipelineValue: 0 },
      followUps: { overdue: [], upcoming: [] },
    },
    rolodex: { peoplePerCircle: [], upcomingDates: [], dueReminders: [] },
    pages: [],
    ...overrides,
  };
}

describe("launcherReadouts", () => {
  it("reports an empty tenant as all-zero and green", () => {
    const units = launcherReadouts(input());
    expect(units.crm.status).toBe("ok");
    expect(units.space.status).toBe("ok");
    expect(units.rolodex.status).toBe("ok");
    expect(units.crm.readouts).toEqual([
      { label: "Open", value: "0" },
      { label: "Pipeline", value: "$0" },
      { label: "Follow-ups", value: "0" },
    ]);
    expect(units.space.readouts).toEqual([
      { label: "Pages", value: "0" },
      { label: "Databases", value: "0" },
    ]);
    expect(units.rolodex.readouts).toEqual([
      { label: "People", value: "0" },
      { label: "Overdue", value: "0" },
      { label: "Dates 30d", value: "0" },
    ]);
  });

  it("shows CRM counts with a compact pipeline figure", () => {
    const { crm } = launcherReadouts(
      input({
        crm: {
          tiles: { openDealCount: 12, pipelineValue: 184300 },
          followUps: { overdue: [], upcoming: [{}, {}, {}] },
        },
      }),
    );
    expect(crm.readouts).toEqual([
      { label: "Open", value: "12" },
      { label: "Pipeline", value: "$184.3K" },
      { label: "Follow-ups", value: "3", tone: "warn" },
    ]);
    expect(crm.status).toBe("warn");
  });

  it("formats the pipeline figure the same on every machine", () => {
    const pipeline = (pipelineValue: number) =>
      launcherReadouts(
        input({
          crm: {
            tiles: { openDealCount: 1, pipelineValue },
            followUps: { overdue: [], upcoming: [] },
          },
        }),
      ).crm.readouts[1].value;
    expect(pipeline(0)).toBe("$0");
    expect(pipeline(999)).toBe("$999");
    expect(pipeline(130000)).toBe("$130K");
    expect(pipeline(1250000)).toBe("$1.3M");
  });

  it("turns CRM red when any follow-up is overdue", () => {
    const { crm } = launcherReadouts(
      input({
        crm: {
          tiles: { openDealCount: 1, pipelineValue: 500 },
          followUps: { overdue: [{}], upcoming: [{}] },
        },
      }),
    );
    expect(crm.status).toBe("bad");
    expect(crm.readouts[2]).toEqual({
      label: "Follow-ups",
      value: "2",
      tone: "bad",
    });
  });

  it("counts Space pages and databases, and leaves rows out", () => {
    const { space } = launcherReadouts(
      input({
        pages: [
          { type: "page" },
          { type: "page" },
          { type: "database" },
          { type: "row" },
          { type: "row" },
        ],
      }),
    );
    expect(space.readouts).toEqual([
      { label: "Pages", value: "2" },
      { label: "Databases", value: "1" },
    ]);
  });

  it("sums Rolodex circles and turns red on overdue people", () => {
    const { rolodex } = launcherReadouts(
      input({
        rolodex: {
          peoplePerCircle: [
            { total: 20, overdue: 4 },
            { total: 14, overdue: 1 },
          ],
          upcomingDates: [{}, {}],
          dueReminders: [],
        },
      }),
    );
    expect(rolodex.readouts).toEqual([
      { label: "People", value: "34" },
      { label: "Overdue", value: "5", tone: "bad" },
      { label: "Dates 30d", value: "2" },
    ]);
    expect(rolodex.status).toBe("bad");
  });

  it("turns Rolodex amber for due reminders or dates when nobody is overdue", () => {
    const base = { peoplePerCircle: [{ total: 3, overdue: 0 }] };
    expect(
      launcherReadouts(
        input({ rolodex: { ...base, upcomingDates: [{}], dueReminders: [] } }),
      ).rolodex.status,
    ).toBe("warn");
    expect(
      launcherReadouts(
        input({ rolodex: { ...base, upcomingDates: [], dueReminders: [{}] } }),
      ).rolodex.status,
    ).toBe("warn");
  });
});
