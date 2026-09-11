import Link from "next/link";
import { isSignupEnabled } from "@/lib/auth/signup";
import { SignUpForm } from "./signup-form";
import styles from "../auth-stage.module.css";

/**
 * The flag is read per request, not baked at build time: without this the page
 * would be prerendered with whatever AUTH_SIGNUP_ENABLED said during the build,
 * and a closed build could keep serving the form after the flag flipped.
 */
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  const open = isSignupEnabled(process.env);

  return (
    <main className={styles["auth-stage"]}>
      <span className={styles["auth-mark"]} aria-hidden="true">
        A
      </span>
      <div className={`${styles["auth-card"]} reveal`}>
        <div className={styles["auth-brandrow"]}>
          <span className="atrium-brand">
            <span className="atrium-brand-mark" aria-hidden="true" />
          </span>
          <h1>{open ? "Create an account" : "Signups closed"}</h1>
        </div>
        {open ? (
          <>
            <p className={styles["auth-tag"]}>
              Your own Atrium — empty CRM, Space, and Rolodex.
            </p>
            <SignUpForm />
          </>
        ) : (
          <p className={styles["auth-note"]} role="status">
            Atrium accounts are created by the owner. Ask them for the login, or
            sign in if you already have one.
          </p>
        )}
        <div className={styles["auth-foot"]}>
          <Link href="/login">Sign in</Link>
          <span>v1 · 2026</span>
        </div>
      </div>
    </main>
  );
}
