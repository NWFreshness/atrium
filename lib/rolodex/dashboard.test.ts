import { describe, expect, it } from "vitest";
import { getDashboard, upcomingDates } from "./dashboard";
import {
  createImportantDate,
  createInteraction,
  createMemoryRolodexRepository,
  createNews,
  createPerson,
  createReminder,
  updatePerson,
  updateReminder,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";
const today = "2026-03-20";

describe("whoToContact", () => {
  it("lists due and overdue, most overdue first, excluding off and snoozed", async () => {
    const memory = createMemoryRolodexRepository();
    const never = await createPerson(
      tenantA,
      { name: "Never", circle: "inner" },
      memory,
    );
    const overdue = await createPerson(
      tenantA,
      { name: "Overdue", circle: "inner" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: overdue.id, type: "call", date: "2025-01-01" },
      memory,
    );
    const dueSoon = await createPerson(
      tenantA,
      { name: "Due Soon", circle: "inner" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: dueSoon.id, type: "call", date: "2026-02-20" },
      memory,
    );
    const inTouch = await createPerson(
      tenantA,
      { name: "In Touch", circle: "inner" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: inTouch.id, type: "call", date: "2026-03-19" },
      memory,
    );
    await createPerson(tenantA, { name: "Off", checkinsOff: true }, memory);
    const snoozed = await createPerson(
      tenantA,
      { name: "Snoozed", snoozedUntil: "2026-04-01" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: snoozed.id, type: "call", date: "2025-01-01" },
      memory,
    );

    const dashboard = await getDashboard(tenantA, memory, today);
    expect(dashboard.whoToContact.map((row) => row.name)).toEqual([
      "Never",
      "Overdue",
      "Due Soon",
    ]);
    expect(dashboard.whoToContact[0]?.overdueDays).toBe(0);
    expect(dashboard.whoToContact[1]?.status).toBe("overdue");
    expect(dashboard.whoToContact[2]?.status).toBe("due_soon");
  });
});

describe("upcomingDates", () => {
  it("includes next occurrences within 30 days and lands 29 Feb on 28 in a common year", async () => {
    const memory = createMemoryRolodexRepository();
    const sam = await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    await createImportantDate(
      tenantA,
      {
        personId: sam.id,
        type: "birthday",
        month: 4,
        day: 10,
        year: 1990,
      },
      memory,
    );
    await createImportantDate(
      tenantA,
      {
        personId: sam.id,
        type: "other",
        label: "Leap",
        month: 2,
        day: 29,
        year: null,
      },
      memory,
    );
    const far = await getDashboard(tenantA, memory, "2026-01-01");
    expect(far.upcomingDates).toEqual([]);

    const near = await getDashboard(tenantA, memory, "2026-03-20");
    expect(near.upcomingDates.map((row) => row.date)).toEqual(["2026-04-10"]);
    expect(near.upcomingDates[0]?.ageTurning).toBe(36);
    expect(near.upcomingDates[0]?.milestone).toBe(false);

    const leap = upcomingDates(
      [
        {
          id: "d1",
          tenantId: tenantA,
          personId: sam.id,
          personName: sam.name,
          type: "birthday",
          label: null,
          month: 2,
          day: 29,
          year: 2000,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
      30,
      "2027-02-01",
    );
    expect(leap[0]?.date).toBe("2027-02-28");
    expect(leap[0]?.daysAway).toBe(27);
  });
});

describe("dueReminders", () => {
  it("lists open due and overdue reminders only", async () => {
    const memory = createMemoryRolodexRepository();
    const sam = await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    await createReminder(
      tenantA,
      { personId: sam.id, text: "Overdue book", dueDate: "2026-03-01" },
      memory,
    );
    await createReminder(
      tenantA,
      { personId: sam.id, text: "Due today", dueDate: today },
      memory,
    );
    await createReminder(
      tenantA,
      { personId: sam.id, text: "Later", dueDate: "2026-04-01" },
      memory,
    );
    const done = await createReminder(
      tenantA,
      { personId: sam.id, text: "Done", dueDate: "2026-03-01" },
      memory,
    );
    await updateReminder(
      tenantA,
      done.id,
      { done: true, doneAt: today },
      memory,
    );

    const dashboard = await getDashboard(tenantA, memory, today);
    expect(dashboard.dueReminders.map((row) => row.text)).toEqual([
      "Overdue book",
      "Due today",
    ]);
    expect(dashboard.dueReminders[0]?.overdue).toBe(true);
    expect(dashboard.dueReminders[1]?.dueToday).toBe(true);
  });
});

describe("interactionsPerMonth and peoplePerCircle", () => {
  it("fills twelve months and counts overdue per circle", async () => {
    const memory = createMemoryRolodexRepository();
    const inner = await createPerson(
      tenantA,
      { name: "Inner", circle: "inner" },
      memory,
    );
    await createPerson(tenantA, { name: "Close", circle: "close" }, memory);
    await createInteraction(
      tenantA,
      { personId: inner.id, type: "call", date: "2026-03-01" },
      memory,
    );
    await createInteraction(
      tenantA,
      { personId: inner.id, type: "email", date: "2026-03-02" },
      memory,
    );

    const dashboard = await getDashboard(tenantA, memory, today);
    expect(dashboard.interactionsPerMonth).toHaveLength(12);
    expect(dashboard.interactionsPerMonth[0]?.key).toBe("2025-04");
    expect(dashboard.interactionsPerMonth.at(-1)?.key).toBe("2026-03");
    expect(
      dashboard.interactionsPerMonth.find((row) => row.key === "2026-03")
        ?.count,
    ).toBe(2);
    expect(
      dashboard.interactionsPerMonth.find((row) => row.key === "2026-02")
        ?.count,
    ).toBe(0);

    const innerRow = dashboard.peoplePerCircle.find(
      (row) => row.circle === "inner",
    );
    expect(innerRow?.total).toBe(1);
    expect(innerRow?.inTouch).toBe(1);
    expect(innerRow?.dueSoon).toBe(0);
    const closeRow = dashboard.peoplePerCircle.find(
      (row) => row.circle === "close",
    );
    expect(closeRow?.dueSoon).toBe(1);
    expect(closeRow?.overdue).toBe(0);
  });
});

describe("getDashboard", () => {
  it("does not mix owner and demo rows", async () => {
    const memory = createMemoryRolodexRepository();
    const sam = await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    await createPerson(tenantB, { name: "Other Tenant" }, memory);
    await createNews(
      tenantA,
      { personId: sam.id, text: "Moved", date: today },
      memory,
    );

    const a = await getDashboard(tenantA, memory, today);
    const b = await getDashboard(tenantB, memory, today);
    expect(a.whoToContact.map((row) => row.name)).toEqual(["Sam Rivera"]);
    expect(b.whoToContact.map((row) => row.name)).toEqual(["Other Tenant"]);
    expect(a.recentActivity.map((row) => row.text)).toEqual(["Moved"]);
    expect(b.recentActivity).toEqual([]);
  });

  it("drops a person from who-to-contact after logging an interaction", async () => {
    const memory = createMemoryRolodexRepository();
    const sam = await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    const before = await getDashboard(tenantA, memory, today);
    expect(before.whoToContact.map((row) => row.name)).toEqual(["Sam Rivera"]);

    await createInteraction(
      tenantA,
      { personId: sam.id, type: "call", date: today },
      memory,
    );
    const after = await getDashboard(tenantA, memory, today);
    expect(after.whoToContact).toEqual([]);
  });

  it("reflects a completed reminder, news, and circle change", async () => {
    const memory = createMemoryRolodexRepository();
    const sam = await createPerson(tenantA, { name: "Sam Rivera" }, memory);
    const reminder = await createReminder(
      tenantA,
      { personId: sam.id, text: "Send the book", dueDate: today },
      memory,
    );
    const before = await getDashboard(tenantA, memory, today);
    expect(before.dueReminders.map((row) => row.text)).toEqual([
      "Send the book",
    ]);

    await updateReminder(
      tenantA,
      reminder.id,
      { done: true, doneAt: today },
      memory,
    );
    await createNews(
      tenantA,
      { personId: sam.id, text: "New job", date: today },
      memory,
    );
    await updatePerson(tenantA, sam.id, { circle: "distant" }, memory);

    const after = await getDashboard(tenantA, memory, today);
    expect(after.dueReminders).toEqual([]);
    expect(after.recentActivity.map((row) => row.kind).sort()).toEqual([
      "news",
      "reminder_done",
    ]);
    expect(
      after.peoplePerCircle.find((row) => row.circle === "distant")?.total,
    ).toBe(1);
  });
});
