"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  INTERACTION_TYPES,
  type InteractionType,
} from "@/lib/rolodex/constants";
import {
  createFactAction,
  createInteractionAction,
  createNewsAction,
  createReminderAction,
  toggleReminderDoneAction,
} from "@/lib/rolodex/log-actions";
import type { Fact, Reminder } from "@/lib/rolodex/queries";
import type { TimelineEntry } from "@/lib/rolodex/timeline";
import { TimelineList } from "./timeline-list";
import styles from "./people.module.css";

export function PersonLog({
  personId,
  facts,
  reminders,
  timeline,
  today,
}: {
  personId: string;
  facts: Fact[];
  reminders: Reminder[];
  timeline: TimelineEntry[];
  today: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function refresh() {
    router.refresh();
  }

  async function onInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    try {
      await createInteractionAction({
        personId,
        type: data.get("type") as InteractionType,
        date: String(data.get("date") || today),
        notes: String(data.get("notes") || "") || null,
      });
      form.reset();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function onFact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("text") || "").trim();
    if (!text) {
      return;
    }
    setPending(true);
    try {
      await createFactAction({ personId, text });
      form.reset();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function onNews(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") || "").trim();
    if (!text) {
      return;
    }
    setPending(true);
    try {
      await createNewsAction({
        personId,
        text,
        date: String(data.get("date") || today),
      });
      form.reset();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function onReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") || "").trim();
    const dueDate = String(data.get("dueDate") || "");
    if (!text || !dueDate) {
      return;
    }
    setPending(true);
    try {
      await createReminderAction({ personId, text, dueDate });
      form.reset();
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h2>Timeline</h2>
      <TimelineList entries={timeline} />

      <h2>Log an interaction</h2>
      <form className={styles["rolodex-search"]} onSubmit={onInteraction}>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="interaction-type">Type</label>
          <select id="interaction-type" name="type" defaultValue="call">
            {INTERACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="interaction-date">Date</label>
          <input
            id="interaction-date"
            name="date"
            type="date"
            defaultValue={today}
          />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="interaction-notes">Notes</label>
          <input id="interaction-notes" name="notes" />
        </div>
        <button type="submit" disabled={pending}>
          Log
        </button>
      </form>

      <h2>Facts</h2>
      {facts.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No facts</p>
      ) : (
        <ul className={styles["rolodex-facts"]}>
          {facts.map((fact) => (
            <li key={fact.id}>{fact.text}</li>
          ))}
        </ul>
      )}
      <form className={styles["rolodex-search"]} onSubmit={onFact}>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="fact-text">Fact</label>
          <input id="fact-text" name="text" required />
        </div>
        <button type="submit" disabled={pending}>
          Add fact
        </button>
      </form>

      <h2>News</h2>
      <form className={styles["rolodex-search"]} onSubmit={onNews}>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="news-text">News</label>
          <input id="news-text" name="text" required />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="news-date">Date</label>
          <input id="news-date" name="date" type="date" defaultValue={today} />
        </div>
        <button type="submit" disabled={pending}>
          Add news
        </button>
      </form>

      <h2>Reminders</h2>
      {reminders.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No reminders</p>
      ) : (
        <ul className={styles["rolodex-log-list"]}>
          {reminders.map((reminder) => (
            <li key={reminder.id}>
              <label>
                <input
                  type="checkbox"
                  checked={reminder.done}
                  aria-label={
                    reminder.done
                      ? `Mark ${reminder.text} not done`
                      : `Mark ${reminder.text} done`
                  }
                  onChange={async () => {
                    await toggleReminderDoneAction(reminder.id, !reminder.done);
                    await refresh();
                  }}
                />{" "}
                {reminder.text} · due {reminder.dueDate}
              </label>
            </li>
          ))}
        </ul>
      )}
      <form className={styles["rolodex-search"]} onSubmit={onReminder}>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="reminder-text">Reminder</label>
          <input id="reminder-text" name="text" required />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="reminder-due">Due</label>
          <input id="reminder-due" name="dueDate" type="date" required />
        </div>
        <button type="submit" disabled={pending}>
          Add reminder
        </button>
      </form>
    </div>
  );
}
