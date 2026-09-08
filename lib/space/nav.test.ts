import { describe, expect, it } from "vitest";
import { isSpacePageCurrent, spacePageIdFromPath } from "./nav";

describe("spacePageIdFromPath", () => {
  it("returns null on the Space landing path", () => {
    expect(spacePageIdFromPath("/space")).toBeNull();
    expect(spacePageIdFromPath("/space/")).toBeNull();
  });

  it("returns the page id from /space/[id]", () => {
    expect(spacePageIdFromPath("/space/abc")).toBe("abc");
    expect(spacePageIdFromPath("/space/abc/extra")).toBe("abc");
  });

  it("does not treat other apps as Space pages", () => {
    expect(spacePageIdFromPath("/crm")).toBeNull();
    expect(spacePageIdFromPath("/")).toBeNull();
  });
});

describe("isSpacePageCurrent", () => {
  it("marks the matching id current", () => {
    expect(isSpacePageCurrent("/space/abc", "abc")).toBe(true);
  });

  it("does not mark a different id current", () => {
    expect(isSpacePageCurrent("/space/abc", "other")).toBe(false);
    expect(isSpacePageCurrent("/space", "abc")).toBe(false);
  });
});
