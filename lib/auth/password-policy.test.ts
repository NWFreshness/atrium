import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  checkPasswordStrength,
} from "./password-policy";

const EMOJI = "😀";

describe("checkPasswordStrength", () => {
  it("pins the floor at 12 code points and the ceiling at 72 bytes", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(MAX_PASSWORD_BYTES).toBe(72);
  });

  it("counts the floor in code points, not UTF-16 units", () => {
    // Six visible characters are twelve UTF-16 units, which is what the two
    // surfaces used to accept. Twelve code points is the rule.
    expect(EMOJI.repeat(6)).toHaveLength(12);
    expect(checkPasswordStrength(EMOJI.repeat(6))).toEqual({
      ok: false,
      code: "weak_password",
    });
    expect(checkPasswordStrength(EMOJI.repeat(11))).toEqual({
      ok: false,
      code: "weak_password",
    });
    expect(checkPasswordStrength(EMOJI.repeat(12))).toEqual({
      ok: true,
      value: EMOJI.repeat(12),
    });
  });

  it("accepts a twelve-character ASCII password and rejects eleven", () => {
    expect(checkPasswordStrength("abcdefghijkl")).toEqual({
      ok: true,
      value: "abcdefghijkl",
    });
    expect(checkPasswordStrength("abcdefghijk")).toEqual({
      ok: false,
      code: "weak_password",
    });
    expect(checkPasswordStrength("")).toEqual({
      ok: false,
      code: "weak_password",
    });
  });

  it("reports anything that is not a string as weak rather than throwing", () => {
    for (const value of [undefined, null, 42, true, {}, ["abcdefghijkl"]]) {
      expect(checkPasswordStrength(value)).toEqual({
        ok: false,
        code: "weak_password",
      });
    }
  });

  it("keeps the 72-byte bcrypt ceiling, with its own code", () => {
    expect(Buffer.byteLength("a".repeat(72), "utf8")).toBe(72);
    expect(checkPasswordStrength("a".repeat(72))).toEqual({
      ok: true,
      value: "a".repeat(72),
    });
    expect(checkPasswordStrength("a".repeat(73))).toEqual({
      ok: false,
      code: "password_too_long",
    });
    // Twelve four-byte code points are 48 bytes: over the floor, under the
    // ceiling, and never mistaken for weak.
    expect(Buffer.byteLength(EMOJI.repeat(12), "utf8")).toBe(48);
    expect(checkPasswordStrength(EMOJI.repeat(12)).ok).toBe(true);
  });

  it("returns the string it was given, unnormalized", () => {
    // `é` as a combining sequence is two code points per character; the value
    // must come back byte-identical rather than NFC-composed.
    const decomposed = "e\u0301".repeat(6);

    const result = checkPasswordStrength(decomposed);

    expect(result).toEqual({ ok: true, value: decomposed });
    expect(result.ok && result.value).toBe(decomposed);
  });
});

describe("the password policy has one definition", () => {
  const read = (file: string) =>
    readFileSync(new URL(file, import.meta.url), "utf8");

  it("is the module both password surfaces call", () => {
    const signup = read("./signup.ts");
    const changePassword = read("./change-password.ts");

    expect(signup).toContain("checkPasswordStrength(");
    expect(changePassword).toContain("checkPasswordStrength(");
    // No second minimum-length comparison on either surface.
    expect(signup).not.toMatch(/\.length\s*</);
    expect(changePassword).not.toMatch(/\.length\s*</);
  });

  it("is the only place the two numbers are defined", () => {
    for (const file of ["./signup.ts", "./change-password.ts"]) {
      const source = read(file);
      expect(source).not.toMatch(
        /const\s+(MIN_PASSWORD_LENGTH|MAX_PASSWORD_BYTES)\s*=/,
      );
      expect(source).not.toMatch(/byteLength\([^)]*\)\s*>\s*72/);
      expect(source).not.toMatch(/\.length\s*<\s*12/);
    }
  });

  it("does not throw error classes — each surface maps the code itself", () => {
    const policy = read("./password-policy.ts");

    expect(policy).not.toMatch(
      /import\s+(type\s+)?\{[^}]*(SignUpError|ChangePasswordError)[^}]*\}/,
    );
    expect(policy).not.toMatch(/new\s+(SignUpError|ChangePasswordError)\(/);
  });
});
