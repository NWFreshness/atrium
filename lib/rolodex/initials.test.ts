import { describe, expect, it } from "vitest";
import { colorFromName, initialsFromName } from "./initials";

describe("initialsFromName", () => {
  it("uses first and last initials", () => {
    expect(initialsFromName("Maya Chen")).toBe("MC");
  });

  it("uses two letters of a single name", () => {
    expect(initialsFromName("Ada")).toBe("AD");
  });

  it("falls back when the name is blank", () => {
    expect(initialsFromName("   ")).toBe("?");
  });
});

describe("colorFromName", () => {
  it("returns a stable flat color for the same name", () => {
    expect(colorFromName("Maya Chen")).toBe(colorFromName("Maya Chen"));
  });

  it("does not use a purple background", () => {
    expect(colorFromName("Maya Chen").toLowerCase()).not.toBe("#753991");
  });
});
