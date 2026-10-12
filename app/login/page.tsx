import Link from "next/link";
import { demoCredentials } from "@/lib/auth/demo";
import { isSignupEnabled } from "@/lib/auth/signup";
import { DemoEntry, LoginForm } from "./login-form";
import styles from "../auth-stage.module.css";

/** Same reason as /signup: the footer depends on the signup flag at request time. */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const signupOpen = isSignupEnabled(process.env);
  const demoOpen = demoCredentials(process.env) !== null;

  return (
    <main className={styles["auth-stage"]}>
      <span className={styles["auth-mark"]} aria-hidden="true">
        A
      </span>
      <div className={`${styles["auth-card"]} reveal atrium-fit`}>
        <p className={styles["auth-plate"]}>Model AT-4 · four units</p>
        <div className={styles["auth-brandrow"]}>
          <span className="atrium-brand">
            <span className="atrium-brand-mark" aria-hidden="true" />
          </span>
          <h1>Atrium</h1>
        </div>
        <p className={styles["auth-tag"]}>Four personal apps, one login.</p>
        <LoginForm />
        {demoOpen ? <DemoEntry /> : null}
        <div className={styles["auth-foot"]}>
          {signupOpen ? (
            <Link href="/signup">Create an account</Link>
          ) : (
            <span>Signups closed</span>
          )}
          <span className={styles["auth-standby"]}>
            <span className="atrium-led atrium-led-off" aria-hidden="true" />
            Standby
          </span>
        </div>
      </div>
    </main>
  );
}
