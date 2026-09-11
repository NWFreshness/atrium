import { describe, expect, it } from "vitest";
import {
  PASSWORDS_DO_NOT_MATCH,
  SIGN_UP_MESSAGES,
  SIGNUPS_CLOSED,
  signUpMessage,
} from "./signup-messages";
import { SignUpError } from "./signup";

describe("signUpMessage", () => {
  it("has copy for every code signUp can raise", () => {
    const codes = [
      "closed",
      "invalid_email",
      "weak_password",
      "password_too_long",
      "unavailable",
    ] as const;

    for (const code of codes) {
      expect(signUpMessage(code)).toBe(SIGN_UP_MESSAGES[code]);
      expect(signUpMessage(code).length).toBeGreaterThan(0);
    }
    expect(Object.keys(SIGN_UP_MESSAGES).sort()).toEqual([...codes].sort());
  });

  it("keeps the duplicate-email case generic", () => {
    const message = signUpMessage("unavailable").toLowerCase();

    for (const leak of ["taken", "exists", "already", "registered", "in use"]) {
      expect(message).not.toContain(leak);
    }
  });

  it("names the maximum length instead of reusing the minimum-length copy", () => {
    expect(signUpMessage("password_too_long")).not.toBe(
      signUpMessage("weak_password"),
    );
    expect(signUpMessage("password_too_long")).toContain("72");
    expect(signUpMessage("weak_password")).toContain("12");
  });

  it("matches the codes the error class carries", () => {
    const thrown = new SignUpError("unavailable");
    expect(signUpMessage(thrown.code)).toBe(SIGN_UP_MESSAGES.unavailable);
  });

  it("exports the constants the page composes with", () => {
    expect(SIGNUPS_CLOSED).toBe(SIGN_UP_MESSAGES.closed);
    expect(PASSWORDS_DO_NOT_MATCH).toBe("Passwords do not match.");
  });
});
