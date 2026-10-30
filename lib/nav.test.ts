import { describe, expect, it } from "vitest";
import { isSection } from "./nav";

describe("isSection under /crm", () => {
  it("marks Dashboard current only on exact /crm", () => {
    expect(isSection("/crm", "/crm", "/crm")).toBe(true);
  });

  it("does not mark Dashboard current on nested CRM routes", () => {
    expect(isSection("/crm/organizations", "/crm", "/crm")).toBe(false);
    expect(isSection("/crm/contacts", "/crm", "/crm")).toBe(false);
    expect(isSection("/crm/deals", "/crm", "/crm")).toBe(false);
    expect(isSection("/crm/pipeline", "/crm", "/crm")).toBe(false);
  });

  it("marks a section current on its exact path", () => {
    expect(isSection("/crm/organizations", "/crm", "/crm/organizations")).toBe(
      true,
    );
    expect(isSection("/crm/contacts", "/crm", "/crm/contacts")).toBe(true);
    expect(isSection("/crm/deals", "/crm", "/crm/deals")).toBe(true);
    expect(isSection("/crm/pipeline", "/crm", "/crm/pipeline")).toBe(true);
  });

  it("marks a section current on nested paths under that href", () => {
    expect(
      isSection("/crm/organizations/acme", "/crm", "/crm/organizations"),
    ).toBe(true);
    expect(isSection("/crm/deals/abc/edit", "/crm", "/crm/deals")).toBe(true);
  });

  it("does not mark a section current for a sibling href", () => {
    expect(isSection("/crm/contacts", "/crm", "/crm/organizations")).toBe(
      false,
    );
    expect(isSection("/crm/organizations", "/crm", "/crm/contacts")).toBe(
      false,
    );
  });
});

describe("isSection under /rolodex", () => {
  it("marks Today current only on exact /rolodex", () => {
    expect(isSection("/rolodex", "/rolodex", "/rolodex")).toBe(true);
  });

  it("does not mark Today current on nested Rolodex routes", () => {
    expect(isSection("/rolodex/people", "/rolodex", "/rolodex")).toBe(false);
    expect(isSection("/rolodex/circles", "/rolodex", "/rolodex")).toBe(false);
    expect(isSection("/rolodex/calendar", "/rolodex", "/rolodex")).toBe(false);
    expect(isSection("/rolodex/timeline", "/rolodex", "/rolodex")).toBe(false);
  });

  it("marks a section current on its exact path", () => {
    expect(isSection("/rolodex/people", "/rolodex", "/rolodex/people")).toBe(
      true,
    );
    expect(isSection("/rolodex/circles", "/rolodex", "/rolodex/circles")).toBe(
      true,
    );
    expect(
      isSection("/rolodex/calendar", "/rolodex", "/rolodex/calendar"),
    ).toBe(true);
    expect(
      isSection("/rolodex/timeline", "/rolodex", "/rolodex/timeline"),
    ).toBe(true);
  });

  it("marks a section current on nested paths under that href", () => {
    expect(
      isSection("/rolodex/people/abc", "/rolodex", "/rolodex/people"),
    ).toBe(true);
  });

  it("does not mark a section current for a sibling href", () => {
    expect(isSection("/rolodex/circles", "/rolodex", "/rolodex/people")).toBe(
      false,
    );
    expect(isSection("/rolodex/people", "/rolodex", "/rolodex/circles")).toBe(
      false,
    );
  });
});
