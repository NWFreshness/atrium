"use client";

import { useActionState } from "react";
import { createAccount, type SignUpState } from "./actions";
import styles from "../auth-stage.module.css";

const INITIAL: SignUpState = { error: null, email: "" };

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(createAccount, INITIAL);

  return (
    <form action={formAction}>
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
          required
        />
      </label>
      {state.error ? (
        <p className={styles["auth-alert"]} role="alert">
          {state.error}
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
