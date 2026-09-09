import { describe, expect, it } from "vitest";
import {
  CHECK_IN_STATUSES,
  CIRCLE_META,
  CIRCLES,
  CONNECTION_KINDS,
  DATE_TYPES,
  DUE_SOON_WINDOW_DAYS,
  GIFT_KINDS,
  INTERACTION_TYPES,
} from "./constants";

describe("CIRCLES", () => {
  it("lists Bench circles from closest outwards", () => {
    expect(CIRCLES).toEqual(["inner", "close", "wider", "distant"]);
  });
});

describe("CIRCLE_META", () => {
  it("matches Bench cadence days", () => {
    expect(CIRCLE_META.inner.cadenceDays).toBe(30);
    expect(CIRCLE_META.close.cadenceDays).toBe(91);
    expect(CIRCLE_META.wider.cadenceDays).toBe(182);
    expect(CIRCLE_META.distant.cadenceDays).toBe(365);
  });
});

describe("enums", () => {
  it("matches Bench interaction, date, gift, status, and connection values", () => {
    expect(INTERACTION_TYPES).toEqual([
      "call",
      "message",
      "email",
      "met",
      "other",
    ]);
    expect(DATE_TYPES).toEqual([
      "birthday",
      "anniversary",
      "work_anniversary",
      "child_birthday",
      "other",
    ]);
    expect(GIFT_KINDS).toEqual(["idea", "given", "received"]);
    expect(CHECK_IN_STATUSES).toEqual([
      "in_touch",
      "due_soon",
      "overdue",
      "snoozed",
      "off",
    ]);
    expect(CONNECTION_KINDS).toEqual([
      "partner",
      "parent_child",
      "sibling",
      "colleague",
      "other",
    ]);
    expect(DUE_SOON_WINDOW_DAYS).toBe(7);
  });
});
