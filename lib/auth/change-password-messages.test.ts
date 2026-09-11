import { describe, expect, it } from "vitest";
import {
  CHANGE_PASSWORD_MESSAGES,
  PASSWORD_CHANGED,
  changePasswordMessage,
} from "./change-password-messages";

describe("change password copy", () => {
  it("has copy for every code", () => {
    const codes = [
      "wrong_current",
      "weak_password",
      "password_too_long",
      "unchanged",
      "unavailable",
    ] as const;

    expect(Object.keys(CHANGE_PASSWORD_MESSAGES).sort()).toEqual(
      [...codes].sort(),
    );
    for (const code of codes) {
      expect(CHANGE_PASSWORD_MESSAGES[code].length, code).toBeGreaterThan(0);
    }
  });

  it("does not distinguish a missing user from a wrong current password", () => {
    // Both codes mean "your current password did not verify"; different copy
    // would leak whether the account exists.
    expect(CHANGE_PASSWORD_MESSAGES.wrong_current).toBe(
      CHANGE_PASSWORD_MESSAGES.unavailable,
    );
  });

  it("names the rule the form has to satisfy", () => {
    expect(CHANGE_PASSWORD_MESSAGES.weak_password).toContain("12");
    expect(CHANGE_PASSWORD_MESSAGES.unchanged).toMatch(/current/i);
  });

  it("keeps the success line distinct from every failure", () => {
    expect(PASSWORD_CHANGED.length).toBeGreaterThan(0);
    expect(Object.values(CHANGE_PASSWORD_MESSAGES)).not.toContain(
      PASSWORD_CHANGED,
    );
  });

  it("keeps the specific rules distinct from the generic failure", () => {
    const generic = CHANGE_PASSWORD_MESSAGES.wrong_current;
    for (const code of [
      "weak_password",
      "password_too_long",
      "unchanged",
    ] as const) {
      expect(CHANGE_PASSWORD_MESSAGES[code], code).not.toBe(generic);
    }
  });

  it("maps a code through changePasswordMessage", () => {
    expect(changePasswordMessage("wrong_current")).toBe(
      CHANGE_PASSWORD_MESSAGES.wrong_current,
    );
  });
});
