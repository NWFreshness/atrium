import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("verifyPassword", () => {
  it("returns true when the plaintext matches the hash", async () => {
    const plaintext = "owner-secret";
    const passwordHash = await hashPassword(plaintext);
    await expect(verifyPassword(plaintext, passwordHash)).resolves.toBe(true);
  });

  it("returns false when the plaintext does not match the hash", async () => {
    const passwordHash = await hashPassword("owner-secret");
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(
      false,
    );
  });
});
