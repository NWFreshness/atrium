import { describe, expect, it } from "vitest";
import { isCrmSection } from "./nav";

describe("isCrmSection", () => {
  it("marks Dashboard current only on exact /crm", () => {
    expect(isCrmSection("/crm", "/crm")).toBe(true);
  });

  it("does not mark Dashboard current on nested CRM routes", () => {
    expect(isCrmSection("/crm/organizations", "/crm")).toBe(false);
    expect(isCrmSection("/crm/contacts", "/crm")).toBe(false);
    expect(isCrmSection("/crm/deals", "/crm")).toBe(false);
    expect(isCrmSection("/crm/pipeline", "/crm")).toBe(false);
  });

  it("marks a section current on its exact path", () => {
    expect(isCrmSection("/crm/organizations", "/crm/organizations")).toBe(true);
    expect(isCrmSection("/crm/contacts", "/crm/contacts")).toBe(true);
    expect(isCrmSection("/crm/deals", "/crm/deals")).toBe(true);
    expect(isCrmSection("/crm/pipeline", "/crm/pipeline")).toBe(true);
  });

  it("marks a section current on nested paths under that href", () => {
    expect(isCrmSection("/crm/organizations/acme", "/crm/organizations")).toBe(
      true,
    );
    expect(isCrmSection("/crm/deals/abc/edit", "/crm/deals")).toBe(true);
  });

  it("does not mark a section current for a sibling href", () => {
    expect(isCrmSection("/crm/contacts", "/crm/organizations")).toBe(false);
    expect(isCrmSection("/crm/organizations", "/crm/contacts")).toBe(false);
  });
});
