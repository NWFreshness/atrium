"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createActivityAction } from "@/lib/crm/activity-actions";
import { ACTIVITY_TYPES, type ActivityType } from "@/lib/crm/constants";
import styles from "./org.module.css";

function inputValueToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

export function ActivityForm({
  contactId,
  dealId,
}: {
  contactId?: string;
  dealId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<ActivityType>("note");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      return;
    }
    setPending(true);
    try {
      await createActivityAction({
        type,
        description: trimmed,
        contactId,
        dealId,
        dueDate: inputValueToDate(dueDate),
        done,
      });
      setType("note");
      setDescription("");
      setDueDate("");
      setDone(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className={styles["crm-field"]}>
        <label htmlFor="activity-type">Type</label>
        <select
          id="activity-type"
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
        <label htmlFor="activity-description">Description</label>
        <textarea
          id="activity-description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor="activity-due-date">Due date</label>
        <input
          id="activity-due-date"
          name="dueDate"
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>
      <div className={styles["crm-field"]}>
        <label htmlFor="activity-done">
          <input
            id="activity-done"
            name="done"
            type="checkbox"
            checked={done}
            onChange={(event) => setDone(event.target.checked)}
          />{" "}
          Done
        </label>
      </div>
      <div className={styles["crm-form-actions"]}>
        <button type="submit" disabled={pending}>
          Add activity
        </button>
      </div>
    </form>
  );
}
