"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(login, null);

  return (
    <form action={formAction}>
      <label className="atrium-field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@atrium.local"
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
      {error ? <p role="alert">{error}</p> : null}
      <button
        type="submit"
        className="atrium-btn atrium-btn-primary"
        style={{ width: "100%", marginTop: ".4rem", padding: "11px 16px", fontSize: "13.5px" }}
        disabled={pending}
      >
        Sign in
      </button>
    </form>
  );
}