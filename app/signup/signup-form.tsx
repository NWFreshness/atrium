"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PASSWORDS_DO_NOT_MATCH } from "@/lib/auth/signup-messages";
import { createAccount, type SignUpState } from "./actions";
import styles from "../auth-stage.module.css";

const INITIAL: SignUpState = { error: null, email: "" };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(createAccount, INITIAL);
  const [mismatch, setMismatch] = useState(false);

  // The account exists and only the session failed. Offering the form again
  // would run signUp a second time and answer "Could not create account".
  if (state.accountCreated) {
    return (
      <div>
        <p className={styles["auth-alert"]} role="alert">
          {state.error}
        </p>
        <Link
          href="/login"
          className={`atrium-btn atrium-btn-primary ${styles["auth-submit"]}`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      // Catch a mismatched confirmation before the round trip: React 19 clears
      // uncontrolled fields after a form action completes, and retyping two
      // long passwords is the worst path through this form. The server still
      // compares them — this only saves the trip.
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        if (data.get("password") !== data.get("confirmPassword")) {
          event.preventDefault();
          setMismatch(true);
        }
      }}
    >
      <label className="atrium-field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@atrium.local"
          defaultValue={state.email}
          required
        />
      </label>
      <label className="atrium-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          onInput={() => setMismatch(false)}
          required
        />
      </label>
      <label className="atrium-field">
        <span>Confirm password</span>
        <input
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat the password"
          onInput={() => setMismatch(false)}
          required
        />
      </label>
      {mismatch || state.error ? (
        <p className={styles["auth-alert"]} role="alert">
          {mismatch ? PASSWORDS_DO_NOT_MATCH : state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className={`atrium-btn atrium-btn-primary ${styles["auth-submit"]}`}
        disabled={pending}
      >
        Create account
      </button>
    </form>
  );
}
