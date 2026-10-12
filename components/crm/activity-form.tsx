"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  createActivityAction,
  updateActivityAction,
} from "@/lib/crm/activity-actions";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/crm/constants";
import type { Activity } from "@/lib/crm/queries";
import styles from "./org.module.css";

/** YYYY-MM-DD is what `<input type="date">` round-trips. */
function dateToInputValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  // UTC midnight: stable across timezones, the card's documented contract.
  const iso = date.toISOString();
  return iso.slice(0, 10);
}

function inputValueToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

/**
 * `onClose` makes this a dialog; omitting it keeps the legacy inline form
 * (used on the contact and deal detail pages). The dialog has the role,
 * labelled heading, focus-restore and Escape behaviour the spec requires.
 */
export function ActivityForm({
  contactId,
  dealId,
  activity,
  onClose,
}: {
  contactId?: string;
  dealId?: string;
  activity?: Activity;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(activity) && Boolean(onClose);
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const typeSelectRef = useRef<HTMLSelectElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [type, setType] = useState<ActivityType>(activity?.type ?? "note");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [date, setDate] = useState(dateToInputValue(activity?.occurredAt));
  const [dueDate, setDueDate] = useState(dateToInputValue(activity?.dueDate));
  const [done, setDone] = useState(activity?.done ?? false);

  // Focus management for the dialog. Open: capture the previously-focused
  // element and move focus to the Type select. Escape: close. Close (via
  // onClose) restores focus to the element that opened the dialog.
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Defer to next tick so the dialog has been mounted and labelled.
    queueMicrotask(() => {
      typeSelectRef.current?.focus();
    });
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // Restore focus on unmount, which is when the dialog actually closes.
      previousFocusRef.current?.focus?.();
    };
  }, [isEditing, onClose]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }
    setPending(true);
    setSaveFailed(false);
    try {
      const fields = {
        type,
        description: trimmed,
        occurredAt: inputValueToDate(date),
        dueDate: inputValueToDate(dueDate),
        done,
      };
      const saved =
        isEditing && activity
          ? await updateActivityAction(activity.id, fields)
          : await createActivityAction({ ...fields, contactId, dealId });
      if (!saved.ok) {
        // Stay open with what was typed; the message says it did not save.
        setSaveFailed(true);
        return;
      }
      if (isEditing) {
        onClose?.();
      } else {
        setType("note");
        setDescription("");
        setDate("");
        setDueDate("");
        setDone(false);
      }
      router.refresh();
    } catch {
      setSaveFailed(true);
    } finally {
      setPending(false);
    }
  }

  // The dialog has its own copy of every field; the ids differ from the
  // inline form's so a page is never in the duplicate-id state the HTML
  // spec forbids, and so a `getByLabel("Date", { exact: true })` scoped to
  // the dialog matches exactly one element. (AC11 names this.)
  const fieldId = (suffix: string) =>
    isEditing ? `activity-edit-${suffix}` : `activity-${suffix}`;

  const body = (
    <form onSubmit={onSubmit}>
      {saveFailed ? (
        <p role="alert">
          Could not save that activity. Check it and try again.
        </p>
      ) : null}
      <div className={styles["crm-field"]}>
        <label htmlFor={fieldId("type")}>Type</label>
        <select
          ref={typeSelectRef}
          id={fieldId("type")}
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType)}
        >
          {ACTIVITY_TYPES.map((activityType) => (
            <option key={activityType} value={activityType}>
              {activityType}
            </option>
          ))}
        </select>
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor={fieldId("description")}>Description</label>
        <textarea
          id={fieldId("description")}
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor={fieldId("date")}>Date</label>
        <input
          id={fieldId("date")}
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor={fieldId("due-date")}>Due date</label>
        <input
          id={fieldId("due-date")}
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor={fieldId("done")}>
          <input
            id={fieldId("done")}
            name="done"
            type="checkbox"
            checked={done}
            onChange={(event) => setDone(event.target.checked)}
          />{" "}
          Done
        </label>
      </div>
      <div className={styles["crm-form-actions"]}>
        {isEditing ? (
          <>
            <button type="submit" disabled={pending}>
              Save
            </button>
            <button
              type="button"
              onClick={() => onClose?.()}
              disabled={pending}
            >
              Cancel
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending}>
            Add activity
          </button>
        )}
      </div>
    </form>
  );

  if (!isEditing) {
    return body;
  }

  return (
    <div
      ref={dialogRef}
      className={styles["crm-dialog-backdrop"]}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <div className={styles["crm-dialog"]}>
        <h2 id={headingId}>Edit activity</h2>
        {body}
      </div>
    </div>
  );
}
