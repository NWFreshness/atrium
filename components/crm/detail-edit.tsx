"use client";

import { useRef, useState, type ComponentType } from "react";
import styles from "./org.module.css";

/**
 * Edit trigger + dialog host for the three CRM detail pages (11.5).
 *
 * The server page hands the form over as a component reference (`form`)
 * plus a serializable props bag (`formProps`: records and lists only).
 * `onClose` is created here, client-side, so no function other than the
 * `form` module reference itself ever crosses the server/client boundary.
 * The form mounts only after the trigger fires, so opening the page never
 * moves focus; closing returns focus to the trigger via `triggerRef`.
 */
export function DetailEdit<FormProps extends object>({
  form: Form,
  formProps,
  name,
}: {
  form: ComponentType<FormProps & { onClose: () => void }>;
  formProps: FormProps;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-label={`Edit ${name}`}
        className={styles["crm-detail-action"]}
        onClick={() => setOpen(true)}
      >
        Edit
      </button>
      {open ? <Form {...formProps} onClose={close} /> : null}
    </>
  );
}
