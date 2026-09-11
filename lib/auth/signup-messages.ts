import type { SignUpErrorCode } from "./signup";

/**
 * Every code `signUp` can raise, in the words the form shows. `unavailable` is
 * deliberately vague: the signup form must never tell an anonymous visitor
 * which addresses already have an account.
 */
export const SIGN_UP_MESSAGES: Record<SignUpErrorCode, string> = {
  closed: "Signups are closed.",
  invalid_email: "Enter a valid email address.",
  weak_password: "Password must be at least 12 characters.",
  password_too_long: "Password is too long — 72 bytes maximum.",
  unavailable: "Could not create account.",
};

export const SIGNUPS_CLOSED = SIGN_UP_MESSAGES.closed;
export const PASSWORDS_DO_NOT_MATCH = "Passwords do not match.";
export const SIGN_IN_FAILED_AFTER_SIGNUP =
  "Account created, but signing in failed. Try signing in.";

export function signUpMessage(code: SignUpErrorCode): string {
  return SIGN_UP_MESSAGES[code];
}
