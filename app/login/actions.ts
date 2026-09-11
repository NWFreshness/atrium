"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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
