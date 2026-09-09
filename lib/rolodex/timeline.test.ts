import { describe, expect, it } from "vitest";
import {
  createFact,
  createInteraction,
  createMemoryRolodexRepository,
  createNews,
  createPerson,
  createReminder,
  getPerson,
  listFacts,
  updateReminder,
} from "./queries";
import { buildTimeline } from "./timeline";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

describe("buildTimeline", () => {
  it("merges interactions, news, and completed reminders newest first", async () => {
    const memory = createMemoryRolodexRepository();
    const maya = await createPerson(tenantA, { name: "Maya Chen" }, memory);
    await createInteraction(
      tenantA,
      {
        personId: maya.id,
        type: "call",
        date: "2026-01-01",
        notes: "Catch-up",
      },
      memory,
    );
    await createNews(
      tenantA,
      { personId: maya.id, text: "Started at Figma", date: "2026-02-01" },
      memory,
    );
    const reminder = await createReminder(
      tenantA,
      { personId: maya.id, text: "Send book", dueDate: "2026-03-01" },
      memory,
    );
    await updateReminder(
      tenantA,
      reminder.id,
      { done: true, doneAt: "2026-03-02" },
      memory,
    );
    const open = await createReminder(
      tenantA,
      { personId: maya.id, text: "Still open", dueDate: "2026-04-01" },
      memory,
    );
    void open;

    const entries = buildTimeline([maya], {
      interactions: memory.interactions,
      news: memory.news,
      reminders: memory.reminders,
    });
    expect(entries.map((row) => row.kind)).toEqual([
      "reminder_done",
      "news",
      "interaction",
    ]);
    expect(entries[0]?.date).toBe("2026-03-02");
    expect(entries[1]?.text).toBe("Started at Figma");
    expect(entries.find((row) => row.text === "Still open")).toBeUndefined();
  });

  it("filters by person and kind", async () => {
    const memory = createMemoryRolodexRepository();
    const maya = await createPerson(tenantA, { name: "Maya Chen" }, memory);
    const sam = await createPerson(tenantA, { name: "Sam Okoye" }, memory);
    await createNews(
      tenantA,
      { personId: maya.id, text: "Maya news", date: "2026-01-01" },
      memory,
    );
    await createNews(
      tenantA,
      { personId: sam.id, text: "Sam news", date: "2026-02-01" },
      memory,
    );
    const onlyMaya = buildTimeline(
      [maya, sam],
      {
        interactions: memory.interactions,
        news: memory.news,
        reminders: memory.reminders,
      },
      { personId: maya.id },
    );
    expect(onlyMaya.map((row) => row.text)).toEqual(["Maya news"]);
    const onlyNews = buildTimeline(
      [maya, sam],
      {
        interactions: memory.interactions,
        news: memory.news,
        reminders: memory.reminders,
      },
      { kind: "news" },
    );
    expect(onlyNews).toHaveLength(2);
  });
});

describe("logging updates last contacted and latest news", () => {
  it("derives last contacted from the newest interaction", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(tenantA, { name: "Maya Chen" }, memory);
    await createInteraction(
      tenantA,
      { personId: person.id, type: "email", date: "2026-01-10" },
      memory,
    );
    expect((await getPerson(tenantA, person.id, memory))?.lastContacted).toBe(
      "2026-01-10",
    );
    await createInteraction(
      tenantA,
      { personId: person.id, type: "call", date: "2026-02-01" },
      memory,
    );
    expect((await getPerson(tenantA, person.id, memory))?.lastContacted).toBe(
      "2026-02-01",
    );
  });

  it("uses the newest news as latestNews and keeps facts separate", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(
      tenantA,
      { name: "Maya Chen", notes: "Freeform notes" },
      memory,
    );
    await createNews(
      tenantA,
      { personId: person.id, text: "Older", date: "2025-01-01" },
      memory,
    );
    await createNews(
      tenantA,
      { personId: person.id, text: "Newer", date: "2026-01-01" },
      memory,
    );
    await createFact(
      tenantA,
      { personId: person.id, text: "Allergic to shellfish" },
      memory,
    );
    const loaded = await getPerson(tenantA, person.id, memory);
    expect(loaded?.latestNews?.text).toBe("Newer");
    expect(loaded?.notes).toBe("Freeform notes");
    expect(
      (await listFacts(tenantA, memory, { personId: person.id })).map(
        (row) => row.text,
      ),
    ).toEqual(["Allergic to shellfish"]);
  });

  it("toggles reminder done in the same tenant only", async () => {
    const memory = createMemoryRolodexRepository();
    const person = await createPerson(tenantA, { name: "Maya Chen" }, memory);
    const reminder = await createReminder(
      tenantA,
      { personId: person.id, text: "Call back", dueDate: "2026-04-01" },
      memory,
    );
    const other = await createReminder(
      tenantB,
      {
        personId: (await createPerson(tenantB, { name: "Other" }, memory)).id,
        text: "Other reminder",
        dueDate: "2026-04-01",
      },
      memory,
    );
    const toggled = await updateReminder(
      tenantA,
      reminder.id,
      { done: true, doneAt: "2026-04-02" },
      memory,
    );
    expect(toggled?.done).toBe(true);
    expect(
      await updateReminder(tenantA, other.id, { done: true }, memory),
    ).toBeNull();
  });
});
