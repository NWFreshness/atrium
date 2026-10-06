import { describe, expect, it } from "vitest";
import {
  createActivityForSession,
  deleteActivityForSession,
  getActivityForSession,
  listActivitiesForSession,
  toggleActivityDoneForSession,
  updateActivityForSession,
} from "./activity-actions";
import {
  createActivity,
  createContact,
  createDeal,
  createMemoryCrmRepository,
  getActivity,
} from "./queries";

const tenantA = "tenant-a";
const tenantB = "tenant-b";

const sessionA = {
  user: {
    id: "user-a",
    tenantId: tenantA,
    role: "owner" as const,
  },
};

function getSessionA() {
  return Promise.resolve(sessionA);
}

function repo() {
  return createMemoryCrmRepository();
}

describe("activity session actions", () => {
  it("creates note, call, and email with contactId; lists that contact newest first", async () => {
    const memory = repo();
    const contact = await createContact(
      tenantA,
      { name: "Ada", status: "lead" },
      memory,
    );
    const older = await createActivityForSession(
      getSessionA,
      {
        type: "note",
        contactId: contact.id,
        description: "First note",
        occurredAt: new Date("2026-01-01T12:00:00.000Z"),
        tenantId: tenantB,
      },
      memory,
    );
    const call = await createActivityForSession(
      getSessionA,
      {
        type: "call",
        contactId: contact.id,
        description: "Follow-up call",
        occurredAt: new Date("2026-02-01T12:00:00.000Z"),
      },
      memory,
    );
    const email = await createActivityForSession(
      getSessionA,
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
      await listActivitiesForSession(
        getSessionA,
        { contactId: contact.id, tenantId: tenantB },
        memory,
      ),
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
    const created = await createActivityForSession(
      getSessionA,
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
      await listActivitiesForSession(getSessionA, { dealId: deal.id }, memory),
    ).toEqual([created]);
  });

  it("persists dueDate and toggles done", async () => {
    const memory = repo();
    const dueDate = new Date("2026-09-15T15:00:00.000Z");
    const created = await createActivityForSession(
      getSessionA,
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

    const toggled = await toggleActivityDoneForSession(
      getSessionA,
      created!.id,
      true,
      memory,
    );
    expect(toggled?.done).toBe(true);
    expect(toggled?.dueDate).toEqual(dueDate);
    expect(
      await getActivityForSession(getSessionA, created!.id, memory),
    ).toEqual(toggled);

    const undone = await toggleActivityDoneForSession(
      getSessionA,
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

    expect(
      await getActivityForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(
      await toggleActivityDoneForSession(getSessionA, other.id, false, memory),
    ).toBeNull();
    expect(await listActivitiesForSession(getSessionA, {}, memory)).toEqual([]);
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

    expect(
      await createActivityForSession(
        getSessionA,
        {
          type: "note",
          contactId: otherContact.id,
          description: "Hacked",
        },
        memory,
      ),
    ).toBeNull();
    expect(
      await createActivityForSession(
        getSessionA,
        {
          type: "note",
          dealId: otherDeal.id,
          description: "Hacked",
        },
        memory,
      ),
    ).toBeNull();
    expect(await listActivitiesForSession(getSessionA, {}, memory)).toEqual([]);
  });

  it("rejects empty or whitespace description and invalid type", async () => {
    const memory = repo();

    expect(
      await createActivityForSession(
        getSessionA,
        { type: "note", description: "" },
        memory,
      ),
    ).toBeNull();
    expect(
      await createActivityForSession(
        getSessionA,
        { type: "note", description: "   " },
        memory,
      ),
    ).toBeNull();
    expect(
      await createActivityForSession(
        getSessionA,
        { type: "meeting" as "note", description: "Hello" },
        memory,
      ),
    ).toBeNull();
    expect(await listActivitiesForSession(getSessionA, {}, memory)).toEqual([]);
  });

  it("throws when unauthenticated", async () => {
    const memory = repo();
    await expect(
      createActivityForSession(
        async () => null,
        { type: "note", description: "Hello" },
        memory,
      ),
    ).rejects.toThrow("Unauthenticated");
  });

  it("updateActivityForSession updates description and occurredAt for this tenant", async () => {
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

    const updated = await updateActivityForSession(
      getSessionA,
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

  it("updateActivityForSession returns null for an unknown activity type", async () => {
    const memory = repo();
    const created = await createActivity(
      tenantA,
      { type: "call", description: "Call me", done: false },
      memory,
    );

    // The unknown-type check is between the miss-check and the dispatch:
    // getActivity succeeds (the row exists), the type guard fails, the call
    // returns null without dispatching to updateActivity.
    const result = await updateActivityForSession(
      getSessionA,
      created.id,
      {
        type: "carrier-pigeon" as unknown as "call",
        description: "Whatever",
        done: false,
      },
      memory,
    );
    expect(result).toBeNull();
    // The row is unchanged.
    expect(await getActivity(tenantA, created.id, memory)).toMatchObject({
      description: "Call me",
      type: "call",
    });
  });

  it("updateActivityForSession returns null for another tenant's id (AC1)", async () => {
    const memory = repo();
    const other = await createActivity(
      tenantB,
      { type: "email", description: "Other tenant", done: false },
      memory,
    );

    expect(
      await updateActivityForSession(
        getSessionA,
        other.id,
        { type: "call", description: "Hijack", done: false },
        memory,
      ),
    ).toBeNull();
    expect(await getActivity(tenantB, other.id, memory)).toMatchObject({
      description: "Other tenant",
    });
  });

  it("deleteActivityForSession removes the row for this tenant (AC1)", async () => {
    const memory = repo();
    const created = await createActivity(
      tenantA,
      { type: "note", description: "Delete me", done: false },
      memory,
    );

    const removed = await deleteActivityForSession(
      getSessionA,
      created.id,
      memory,
    );
    expect(removed?.id).toBe(created.id);
    expect(await getActivity(tenantA, created.id, memory)).toBeNull();
  });

  it("deleteActivityForSession returns null for another tenant's id (AC1)", async () => {
    const memory = repo();
    const other = await createActivity(
      tenantB,
      { type: "email", description: "Other", done: true },
      memory,
    );

    expect(
      await deleteActivityForSession(getSessionA, other.id, memory),
    ).toBeNull();
    expect(await getActivity(tenantB, other.id, memory)).toMatchObject({
      description: "Other",
    });
  });
});
