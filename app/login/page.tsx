import { LoginForm } from "./login-form";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <main className={styles["login-stage"]}>
      <span className={styles["login-mark"]} aria-hidden="true">
        A
      </span>
      <div className={`${styles["login-card"]} reveal`}>
        <div className={styles["brandrow"]}>
          <span className="atrium-brand">
            <span className="atrium-brand-mark" aria-hidden="true" />
          </span>
          <h1>Atrium</h1>
        </div>
        <p className={styles["tag"]}>Four personal apps, one login.</p>
        <LoginForm />
        <div className={styles["foot"]}>
          <span>Two accounts · no signup</span>
          <span>v1 · 2026</span>
        </div>
      </div>
    </main>
  );
}