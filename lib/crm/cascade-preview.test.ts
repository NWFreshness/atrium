import { describe, expect, it } from "vitest";
import { consequenceMessage, pluralize } from "./cascade-preview";

const empty = { contacts: 0, deals: 0, activities: 0 };

describe("pluralize", () => {
  it("uses the singular for exactly one", () => {
    expect(pluralize(1, "contact")).toBe("1 contact");
    expect(pluralize(1, "activity")).toBe("1 activity");
  });

  it("adds s for any other count", () => {
    expect(pluralize(2, "contact")).toBe("2 contacts");
    expect(pluralize(0, "deal")).toBe("0 deals");
  });

  it("uses the ies plural for activity", () => {
    expect(pluralize(2, "activity")).toBe("2 activities");
  });
});

describe("consequenceMessage", () => {
  it("is the bare message when nothing will be unlinked", () => {
    expect(consequenceMessage("Acme", empty)).toBe("Delete Acme?");
  });

  it("names two nouns with and", () => {
    expect(
      consequenceMessage("Northwind Logistics", {
        contacts: 2,
        deals: 2,
        activities: 0,
      }),
    ).toBe(
      "Delete Northwind Logistics?\nThis will unlink 2 contacts and 2 deals.",
    );
  });

  it("names a single deal", () => {
    expect(
      consequenceMessage("Acme", { contacts: 0, deals: 1, activities: 0 }),
    ).toBe("Delete Acme?\nThis will unlink 1 deal.");
  });

  it("names a single contact", () => {
    expect(
      consequenceMessage("Acme", { contacts: 1, deals: 0, activities: 0 }),
    ).toBe("Delete Acme?\nThis will unlink 1 contact.");
  });

  it("joins three nouns with commas and and", () => {
    expect(
      consequenceMessage("Acme", { contacts: 1, deals: 1, activities: 2 }),
    ).toBe(
      "Delete Acme?\nThis will unlink 1 contact, 1 deal and 2 activities.",
    );
  });

  it("names activities alone", () => {
    expect(
      consequenceMessage("Acme", { contacts: 0, deals: 0, activities: 2 }),
    ).toBe("Delete Acme?\nThis will unlink 2 activities.");
  });

  it("never uses the words cascade or orphan", () => {
    const messages = [
      consequenceMessage("Acme", empty),
      consequenceMessage("Northwind Logistics", {
        contacts: 2,
        deals: 2,
        activities: 0,
      }),
      consequenceMessage("Acme", { contacts: 1, deals: 1, activities: 2 }),
    ];
    for (const message of messages) {
      expect(message).not.toMatch(/cascade/i);
      expect(message).not.toMatch(/orphan/i);
    }
  });
});
