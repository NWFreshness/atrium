"use client";

import { useActionState, useState } from "react";
import { PASSWORD_CHANGED } from "@/lib/auth/change-password-messages";
import { PASSWORDS_DO_NOT_MATCH } from "@/lib/auth/signup-messages";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const INITIAL: ChangePasswordState = { error: null, changed: false };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    INITIAL,
  );
  const [mismatch, setMismatch] = useState(false);

  return (
    <form
      action={formAction}
      // Catch a mismatched confirmation before the round trip: React 19 clears
      // uncontrolled fields when a form action completes, so a server-side
      // mismatch makes the user retype three password fields. The action still
      // compares them — this only saves the trip.
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (data.get("next") !== data.get("confirm")) {
          event.preventDefault();
          setMismatch(true);
        }
      }}
    >
      <label className="atrium-field">
        <span>Current password</span>
        <input
          name="current"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          onInput={() => setMismatch(false)}
          required
        />
      </label>
      <label className="atrium-field">
        <span>New password</span>
        <input
          name="next"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          onInput={() => setMismatch(false)}
          required
        />
      </label>
      <label className="atrium-field">
        <span>Confirm new password</span>
        <input
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat the new password"
          onInput={() => setMismatch(false)}
          required
        />
      </label>
      {mismatch || state.error ? (
        <p className="atrium-alert" role="alert">
          {mismatch ? PASSWORDS_DO_NOT_MATCH : state.error}
        </p>
      ) : null}
      {/* `mismatch` and `state` are independent: a blocked submit never runs the
          action, so `state.changed` still holds the previous change's success.
          Both guards keep a stale "Password updated." off the screen while the
          mismatch alert is up. Not a `//` line — inside JSX children that is text
          on the page, not a comment. */}
      {state.changed && !mismatch && !state.error ? (
        <p className="atrium-alert atrium-alert-ok" role="status">
          {PASSWORD_CHANGED}
        </p>
      ) : null}
      <button
        type="submit"
        className="atrium-btn atrium-btn-primary"
        disabled={pending}
      >
        Update password
      </button>
    </form>
  );
}
