import { describe, expect, it } from "vitest";
import {
  isStaleContacted,
  lastContactedAt,
  daysSinceContacted,
} from "./last-contacted";
import { createActivity, createMemoryCrmRepository } from "./queries";

const tenantId = "tenant-a";

function repo() {
  return createMemoryCrmRepository();
}

describe("last-contacted", () => {
  describe("lastContactedAt", () => {
    it("returns null for an empty list", () => {
      expect(lastContactedAt([])).toBeNull();
    });

    it("returns the dated activity when one is dated and another has no occurredAt", async () => {
      const memory = repo();
      const dated = await createActivity(
        tenantId,
        {
          type: "call",
          description: "Dated",
          occurredAt: new Date("2026-04-01T12:00:00.000Z"),
          done: false,
        },
        memory,
      );
      const undated = await createActivity(
        tenantId,
        { type: "note", description: "Undated", done: false },
        memory,
      );
      expect(lastContactedAt([undated, dated])).toEqual(dated);
      expect(lastContactedAt([dated, undated])).toEqual(dated);
    });

    it("returns the later of two dated activities", async () => {
      const memory = repo();
      const earlier = await createActivity(
        tenantId,
        {
          type: "call",
          description: "Earlier",
          occurredAt: new Date("2026-01-01T00:00:00.000Z"),
          done: false,
        },
        memory,
      );
      const later = await createActivity(
        tenantId,
        {
          type: "email",
          description: "Later",
          occurredAt: new Date("2026-06-01T00:00:00.000Z"),
          done: false,
        },
        memory,
      );
      expect(lastContactedAt([earlier, later])).toEqual(later);
      expect(lastContactedAt([later, earlier])).toEqual(later);
    });
  });

  describe("isStaleContacted", () => {
    it("is false at exactly 30 days", () => {
      const now = new Date("2026-05-01T00:00:00.000Z");
      const thirty = new Date("2026-04-01T00:00:00.000Z");
      expect(isStaleContacted(thirty, now)).toBe(false);
    });

    it("is true at 31 days", () => {
      const now = new Date("2026-05-02T00:00:00.000Z");
      const thirtyOne = new Date("2026-04-01T00:00:00.000Z");
      expect(isStaleContacted(thirtyOne, now)).toBe(true);
    });

    it("is false for null (no contact yet)", () => {
      expect(isStaleContacted(null, new Date())).toBe(false);
    });
  });

  describe("daysSinceContacted", () => {
    it("returns null for null input", () => {
      expect(daysSinceContacted(null, new Date())).toBeNull();
    });

    it("returns the floored number of days between the contact and now", () => {
      const now = new Date("2026-05-10T00:00:00.000Z");
      const five = new Date("2026-05-05T00:00:00.000Z");
      expect(daysSinceContacted(five, now)).toBe(5);
    });

    it("floors partial days", () => {
      const now = new Date("2026-05-10T12:00:00.000Z");
      const partialDayEarlier = new Date("2026-05-10T00:00:00.000Z");
      expect(daysSinceContacted(partialDayEarlier, now)).toBe(0);
    });
  });
});
