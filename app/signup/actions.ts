"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import {
  SignUpError,
  createDefaultSignUpDeps,
  isSignupEnabled,
  signUp,
} from "@/lib/auth/signup";
import {
  PASSWORDS_DO_NOT_MATCH,
  SIGNUPS_CLOSED,
  SIGN_IN_FAILED_AFTER_SIGNUP,
  signUpMessage,
} from "@/lib/auth/signup-messages";

export type SignUpState = {
  error: string | null;
  /** Kept so a rejected form does not make the member retype their address. */
  email: string;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function createAccount(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const confirmPassword = field(formData, "confirmPassword");

  // The page hides the form when signups are closed, but the action is what
  // actually has to fail closed: a hand-rolled POST must not create anyone.
  if (!isSignupEnabled(process.env)) {
    return { error: SIGNUPS_CLOSED, email };
  }

  if (password !== confirmPassword) {
    return { error: PASSWORDS_DO_NOT_MATCH, email };
  }

  try {
    await signUp({ email, password }, createDefaultSignUpDeps());
  } catch (error) {
    if (error instanceof SignUpError) {
      return { error: signUpMessage(error.code), email };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      // The member was created; only the session failed. Saying "could not
      // create account" here would invite a duplicate signup attempt.
      return { error: SIGN_IN_FAILED_AFTER_SIGNUP, email };
    }
    // `signIn` signals success by throwing the redirect. Let it through.
    throw error;
  }

  return { error: null, email };
}
