/**
 * The one password policy. Signup and change-password both call it and map the
 * returned `code` onto their own error class — sharing the decision, not the
 * error type (`SignUpError` and `ChangePasswordError` stay in their modules, so
 * a third password surface adds a mapping, not a second rule).
 *
 * Pure and dependency-free on purpose: no Drizzle, no `getDb`, nothing that
 * would keep a client component from importing it. The forms still round-trip
 * to a server action; the server is the rule.
 */

/** Minimum *code points*, not UTF-16 code units. */
export const MIN_PASSWORD_LENGTH = 12;

/** bcrypt truncates its input at 72 bytes, so anything longer would alias. */
export const MAX_PASSWORD_BYTES = 72;

export type PasswordStrengthFailureCode = "weak_password" | "password_too_long";

export type PasswordStrength =
  | { ok: true; value: string }
  | { ok: false; code: PasswordStrengthFailureCode };

/**
 * Length only — no composition rules, no `Intl.Segmenter`.
 *
 * `Array.from` iterates code points, so `"😀".repeat(6)` counts as 6 (twelve
 * UTF-16 units, which is how the emoji floor was missed) and 12 emoji is a
 * legitimate 48-byte password. The value comes back untouched — no NFC
 * normalization, because the hash must cover exactly what the user typed.
 *
 * Never throws: non-strings and missing values are simply weak, the way the
 * empty-string path already behaved.
 */
export function checkPasswordStrength(password: unknown): PasswordStrength {
  const value = typeof password === "string" ? password : "";

  if (Array.from(value).length < MIN_PASSWORD_LENGTH) {
    return { ok: false, code: "weak_password" };
  }

  if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) {
    return { ok: false, code: "password_too_long" };
  }

  return { ok: true, value };
}
