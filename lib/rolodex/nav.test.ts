import { describe, expect, it } from "vitest";
import { isRolodexSection } from "./nav";

describe("isRolodexSection", () => {
  it("marks Today current only on exact /rolodex", () => {
    expect(isRolodexSection("/rolodex", "/rolodex")).toBe(true);
  });

  it("does not mark Today current on nested Rolodex routes", () => {
    expect(isRolodexSection("/rolodex/people", "/rolodex")).toBe(false);
    expect(isRolodexSection("/rolodex/circles", "/rolodex")).toBe(false);
    expect(isRolodexSection("/rolodex/calendar", "/rolodex")).toBe(false);
    expect(isRolodexSection("/rolodex/timeline", "/rolodex")).toBe(false);
  });

  it("marks a section current on its exact path", () => {
    expect(isRolodexSection("/rolodex/people", "/rolodex/people")).toBe(true);
    expect(isRolodexSection("/rolodex/circles", "/rolodex/circles")).toBe(true);
    expect(isRolodexSection("/rolodex/calendar", "/rolodex/calendar")).toBe(
      true,
    );
    expect(isRolodexSection("/rolodex/timeline", "/rolodex/timeline")).toBe(
      true,
    );
  });

  it("marks a section current on nested paths under that href", () => {
    expect(isRolodexSection("/rolodex/people/abc", "/rolodex/people")).toBe(
      true,
    );
  });

  it("does not mark a section current for a sibling href", () => {
    expect(isRolodexSection("/rolodex/circles", "/rolodex/people")).toBe(false);
    expect(isRolodexSection("/rolodex/people", "/rolodex/circles")).toBe(false);
  });
});
