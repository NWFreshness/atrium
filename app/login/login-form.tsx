"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import styles from "../auth-stage.module.css";

const INITIAL: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

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
          autoComplete="current-password"
          placeholder="••••••••"
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
        Sign in
      </button>
    </form>
  );
}
