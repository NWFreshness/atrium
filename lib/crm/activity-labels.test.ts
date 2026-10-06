import { describe, expect, it } from "vitest";
import {
  LAST_CONTACTED_STALE_DAYS,
  truncateActivityLabel,
} from "./activity-labels";

describe("activity-labels", () => {
  it("exports LAST_CONTACTED_STALE_DAYS as 30", () => {
    expect(LAST_CONTACTED_STALE_DAYS).toBe(30);
  });

  describe("truncateActivityLabel", () => {
    it("returns empty string unchanged", () => {
      expect(truncateActivityLabel("")).toBe("");
    });

    it("returns a 60-character string unchanged", () => {
      const sixty = "a".repeat(60);
      expect(truncateActivityLabel(sixty)).toBe(sixty);
    });

    it("truncates a 61-character string to 60 chars + ellipsis", () => {
      const sixtyOne = "a".repeat(61);
      expect(truncateActivityLabel(sixtyOne)).toBe("a".repeat(60) + "…");
    });

    it("truncates an 8000-character string to 61 chars (60 + ellipsis)", () => {
      const huge = "a".repeat(8000);
      expect(truncateActivityLabel(huge)).toBe("a".repeat(60) + "…");
    });
  });
});
