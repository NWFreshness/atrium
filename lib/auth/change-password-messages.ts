import type { ChangePasswordErrorCode } from "./change-password";

/**
 * Every code `changePassword` can raise, in the words the form shows.
 *
 * Pure on purpose: the client form imports this file, and `change-password.ts`
 * pulls in Drizzle, so the copy lives here for the same reason
 * `signup-messages.ts` does — the browser bundle must not reach the database
 * module graph for a sentence.
 *
 * `wrong_current` and `unavailable` are the same sentence: a caller who cannot
 * prove the current password learns nothing about the account either way.
 */
export const CHANGE_PASSWORD_MESSAGES: Record<ChangePasswordErrorCode, string> =
  {
    wrong_current: "Could not update password.",
    weak_password: "Password must be at least 12 characters.",
    password_too_long: "Password is too long — 72 bytes maximum.",
    unchanged: "Choose a password different from your current one.",
    unavailable: "Could not update password.",
  };

export const PASSWORD_CHANGED = "Password updated.";

export function changePasswordMessage(code: ChangePasswordErrorCode): string {
  return CHANGE_PASSWORD_MESSAGES[code];
}
