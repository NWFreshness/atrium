"use server";

import { auth } from "@/auth";
import {
  ChangePasswordError,
  changePassword,
  createDefaultChangePasswordDeps,
} from "@/lib/auth/change-password";
import { changePasswordMessage } from "@/lib/auth/change-password-messages";
import { PASSWORDS_DO_NOT_MATCH } from "@/lib/auth/signup-messages";
import { requireTenant } from "@/lib/tenancy";

export type ChangePasswordState = {
  error: string | null;
  /** True only once the hash was actually rewritten. The form shows a banner and
   * stays on /settings — there is nowhere better to send the user. */
  changed: boolean;
};

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const current = field(formData, "current");
  const next = field(formData, "next");
  const confirm = field(formData, "confirm");

  // The browser blocks this too; comparing here as well keeps a hand-rolled
  // POST from skipping the check.
  if (next !== confirm) {
    return { error: PASSWORDS_DO_NOT_MATCH, changed: false };
  }

  // The user id comes from the session, never the form: /settings is gated by
  // middleware, but a hand-rolled POST must not be able to name its own user.
  let userId: string;
  try {
    ({ userId } = await requireTenant(() => auth()));
  } catch {
    return { error: changePasswordMessage("unavailable"), changed: false };
  }

  try {
    await changePassword(
      userId,
      { current, next },
      createDefaultChangePasswordDeps(),
    );
  } catch (error) {
    if (error instanceof ChangePasswordError) {
      return { error: changePasswordMessage(error.code), changed: false };
    }
    throw error;
  }

  // No signOut and no redirect: the session JWT stays valid on this device and
  // every other one (spec §4). Revoking sessions needs a store this phase does
  // not have, so the honest behaviour is to say so rather than imply otherwise.
  return { error: null, changed: true };
}
