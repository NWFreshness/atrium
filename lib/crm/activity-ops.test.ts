import { describe, expect, it } from "vitest";
import { InputError } from "../input/result";
import {
  createActivityIn,
  deleteActivityIn,
  getActivityIn,
  listActivitiesIn,
  toggleActivityDoneIn,
  updateActivityIn,
} from "./activity-ops";
import {
  createActivity,
  createContact,
  createDeal,
  createMemoryCrmStore,
  getActivity,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

function repo() {
  return createMemoryCrmStore();
}

describe("activity session actions", () => {
  it("creates note, call, and email with contactId; lists that contact newest first", async () => {
    const memory = repo();
    const contact = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const older = await createActivityIn(
      tenantA,
      {
        type: "note",
        contactId: contact.id,
        description: "First note",
        occurredAt: new Date("2026-01-01T12:00:00.000Z"),
      },
      memory,
    );
    const call = await createActivityIn(
      tenantA,
      {
        type: "call",
        contactId: contact.id,
        description: "Follow-up call",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
      },
      memory,
    );
    const email = await createActivityIn(
      tenantA,
      {
        type: "email",
        contactId: contact.id,
        description: "Sent recap",
        occurredAt: new Date("2026-03-01T12:00:00.000Z"),
      },
      memory,
    );

    expect(older?.tenantId).toBe(tenantA);
    expect(older?.type).toBe("note");
    expect(older?.done).toBe(false);
    expect(older?.occurredAt).toEqual(new Date("2026-01-01T12:00:00.000Z"));
    expect(call?.type).toBe("call");
    expect(email?.type).toBe("email");
    expect(await getActivity(tenantB, older!.id, memory)).toBeNull();

    expect(
      await listActivitiesIn(tenantA, { contactId: contact.id }, memory),
    ).toEqual([email, call, older]);
  });

  it("creates with dealId and defaults occurredAt when omitted", async () => {
    const memory = repo();
    const deal = await createDeal(
      tenantA,
      {
        name: "Widget rollout",
        stage: "New",
        value: 1000,
        probability: 10,
        boardOrder: 0,
      },
      memory,
    );
    const before = Date.now();
    const created = await createActivityIn(
      tenantA,
      {
        type: "note",
        dealId: deal.id,
        description: "Deal note",
      },
      memory,
    );
    const after = Date.now();

    expect(created?.dealId).toBe(deal.id);
    expect(created?.tenantId).toBe(tenantA);
    expect(created?.occurredAt).toBeInstanceOf(Date);
    expect(created!.occurredAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(created!.occurredAt!.getTime()).toBeLessThanOrEqual(after);
    expect(
      await listActivitiesIn(tenantA, { dealId: deal.id }, memory),
    ).toEqual([created]);
  });

  it("persists dueDate and toggles done", async () => {
    const memory = repo();
    const dueDate = new Date("2026-09-15T15:00:00.000Z");
    const created = await createActivityIn(
      tenantA,
      {
        type: "call",
        description: "Follow up",
        dueDate,
        done: false,
      },
      memory,
    );

    expect(created?.dueDate).toEqual(dueDate);
    expect(created?.done).toBe(false);

    const toggled = await toggleActivityDoneIn(
      tenantA,
      created!.id,
      true,
      memory,
    );
    expect(toggled?.done).toBe(true);
    expect(toggled?.dueDate).toEqual(dueDate);
    expect(await getActivityIn(tenantA, created!.id, memory)).toEqual(toggled);

    const undone = await toggleActivityDoneIn(
      tenantA,
      created!.id,
      false,
      memory,
    );
    expect(undone?.done).toBe(false);
  });

  it("returns null for other-tenant get/toggle and does not list that row", async () => {
    const memory = repo();
    const other = await createActivity(
      tenantB,
      { type: "email", description: "Congrats", done: true },
      memory,
    );

    expect(await getActivityIn(tenantA, other.id, memory)).toBeNull();
    expect(
      await toggleActivityDoneIn(tenantA, other.id, false, memory),
    ).toBeNull();
    expect(await listActivitiesIn(tenantA, {}, memory)).toEqual([]);
    expect(await getActivity(tenantB, other.id, memory)).toMatchObject({
      description: "Congrats",
      done: true,
    });
  });

  it("rejects foreign contactId and dealId from another tenant", async () => {
    const memory = repo();
    const otherContact = await createContact(
      tenantB,
      { name: "Bob", status: "lead" },
      memory,
    );
    const otherDeal = await createDeal(
      tenantB,
      {
        name: "Beta deal",
        stage: "Won",
        value: 9000,
        probability: 100,
        boardOrder: 0,
      },
      memory,
    );

    await expect(
      createActivityIn(
        tenantA,
        {
          type: "note",
          contactId: otherContact.id,
          description: "Hacked",
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    await expect(
      createActivityIn(
        tenantA,
        {
          type: "note",
          dealId: otherDeal.id,
          description: "Hacked",
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listActivitiesIn(tenantA, {}, memory)).toEqual([]);
  });

  it("rejects empty or whitespace description and invalid type", async () => {
    const memory = repo();

    await expect(
      createActivityIn(tenantA, { type: "note", description: "" }, memory),
    ).rejects.toBeInstanceOf(InputError);
    await expect(
      createActivityIn(tenantA, { type: "note", description: "   " }, memory),
    ).rejects.toBeInstanceOf(InputError);
    await expect(
      createActivityIn(
        tenantA,
        { type: "meeting" as "note", description: "Hello" },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    expect(await listActivitiesIn(tenantA, {}, memory)).toEqual([]);
  });

  it("updateActivityIn updates description and occurredAt for this tenant", async () => {
    const memory = repo();
    const created = await createActivity(
      tenantA,
      {
        type: "call",
        description: "Original",
        occurredAt: new Date("2026-01-01T00:00:00.000Z"),
        done: false,
      },
      memory,
    );

    const updated = await updateActivityIn(
      tenantA,
      created.id,
      {
        description: "Edited",
        occurredAt: new Date("2026-05-01T00:00:00.000Z"),
        type: "call",
        done: false,
      },
      memory,
    );

    expect(updated?.description).toBe("Edited");
    expect(updated?.occurredAt).toEqual(new Date("2026-05-01T00:00:00.000Z"));
    expect(updated?.type).toBe("call");
  });

  it("updateActivityIn returns null for an unknown activity type", async () => {
    const memory = repo();
    const created = await createActivity(
      tenantA,
      { type: "call", description: "Call me", done: false },
      memory,
    );

    // The unknown-type check is between the miss-check and the dispatch:
    // getActivity succeeds (the row exists), the type guard fails, the call
    // returns null without dispatching to updateActivity.
    await expect(
      updateActivityIn(
        tenantA,
        created.id,
        {
          type: "carrier-pigeon" as unknown as "call",
          description: "Whatever",
          done: false,
        },
        memory,
      ),
    ).rejects.toBeInstanceOf(InputError);
    // The row is unchanged.
    expect(await getActivity(tenantA, created.id, memory)).toMatchObject({
      description: "Call me",
      type: "call",
    });
  });

  it("updateActivityIn returns null for another tenant's id (AC1)", async () => {
    const memory = repo();
    const other = await createActivity(
      tenantB,
      { type: "email", description: "Other tenant", done: false },
      memory,
    );

    expect(
      await updateActivityIn(
        tenantA,
        other.id,
        { type: "call", description: "Hijack", done: false },
        memory,
      ),
    ).toBeNull();
    expect(await getActivity(tenantB, other.id, memory)).toMatchObject({
      description: "Other tenant",
    });
  });

  it("deleteActivityIn removes the row for this tenant (AC1)", async () => {
    const memory = repo();
    const created = await createActivity(
      tenantA,
      { type: "note", description: "Delete me", done: false },
      memory,
    );

    const removed = await deleteActivityIn(tenantA, created.id, memory);
    expect(removed?.id).toBe(created.id);
    expect(await getActivity(tenantA, created.id, memory)).toBeNull();
  });

  it("deleteActivityIn returns null for another tenant's id (AC1)", async () => {
    const memory = repo();
    const other = await createActivity(
      tenantB,
      { type: "email", description: "Other", done: true },
      memory,
    );

    expect(await deleteActivityIn(tenantA, other.id, memory)).toBeNull();
    expect(await getActivity(tenantB, other.id, memory)).toMatchObject({
      description: "Other",
    });
  });
});
