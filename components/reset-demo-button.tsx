"use client";

import { useActionState } from "react";
import { RefreshIcon } from "./atrium-icons";
import styles from "./atrium-nav.module.css";

export type ResetDemoState = {
  ok: boolean;
  message: string;
};

const initialState: ResetDemoState = { ok: false, message: "" };

export function ResetDemoButton({
  action,
}: {
  action: (
    prevState: ResetDemoState,
    formData: FormData,
  ) => Promise<ResetDemoState>;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles["atrium-nav-reset-form"]}>
      <button
        type="submit"
        className={`atrium-btn ${styles["atrium-nav-reset"]}`}
      >
        <RefreshIcon />
        Reset demo
      </button>
      {state.message ? (
        <span className={styles["atrium-nav-reset-status"]} role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}