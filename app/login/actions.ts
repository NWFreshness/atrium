"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { demoCredentials } from "@/lib/auth/demo";

export type LoginState = {
  error: string | null;
  /** Echoed back so a failed attempt does not clear the address (React 19
   * resets uncontrolled fields when a form action completes). The password
   * field is deliberately left empty. */
  email: string;
};

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const value = formData.get("email");
  const email = typeof value === "string" ? value.trim() : "";

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { error: null, email };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password", email };
    }
    throw error;
  }
}

/**
 * One-click entry to the shared demo account. The pair is read from the
 * server environment and handed straight to `signIn`, so it never reaches the
 * browser, and the attempt passes through the same login throttle as a typed
 * one. Returns copy only when the demo cannot be entered.
 */
export async function enterDemo(): Promise<string | null> {
  const demo = demoCredentials(process.env);
  if (!demo) {
    return "The demo is not available right now";
  }

  try {
    await signIn("credentials", { ...demo, redirectTo: "/" });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "The demo is not available right now";
    }
    throw error;
  }
}
