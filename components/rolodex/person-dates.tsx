"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DATE_TYPES, type ImportantDateType } from "@/lib/rolodex/constants";
import {
  createImportantDateAction,
  deleteImportantDateAction,
  updateImportantDateAction,
} from "@/lib/rolodex/date-actions";
import { currentAge, nextOccurrence } from "@/lib/rolodex/dates";
import type { ImportantDate } from "@/lib/rolodex/queries";
import styles from "./people.module.css";

const TYPE_LABEL: Record<ImportantDateType, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  work_anniversary: "Work anniversary",
  child_birthday: "Child's birthday",
  other: "Other",
};

export function PersonDates({
  personId,
  dates,
  today,
}: {
  personId: string;
  dates: ImportantDate[];
  today: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<ImportantDate | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const month = Number(data.get("month"));
    const day = Number(data.get("day"));
    const yearRaw = String(data.get("year") || "").trim();
    const type = String(data.get("type")) as ImportantDateType;
    const label = String(data.get("label") || "").trim() || null;
    if (!month || !day) {
      return;
    }
    setPending(true);
    try {
      const input = {
        personId,
        type,
        label,
        month,
        day,
        year: yearRaw === "" ? null : Number(yearRaw),
      };
      if (editing) {
        await updateImportantDateAction(editing.id, input);
        setEditing(null);
      } else {
        await createImportantDateAction(input);
      }
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2>Important dates</h2>
      {dates.length === 0 ? (
        <p className={styles["rolodex-empty"]}>No important dates</p>
      ) : (
        <ul className={styles["rolodex-log-list"]}>
          {dates.map((row) => {
            const next = nextOccurrence(row, today);
            const age = currentAge(row, today);
            return (
              <li key={row.id}>
                {TYPE_LABEL[row.type]}
                {row.label ? ` · ${row.label}` : ""} · {row.month}/{row.day}
                {row.year != null ? `/${row.year}` : ""}
                {age != null ? ` · age ${age}` : ""}
                {next.ageTurning != null
                  ? ` · turns ${next.ageTurning} on ${next.date}`
                  : ` · next ${next.date}`}
                {next.milestone ? " · milestone" : ""}
                <button
                  type="button"
                  aria-label={`Edit ${TYPE_LABEL[row.type]}`}
                  onClick={() => setEditing(row)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${TYPE_LABEL[row.type]}`}
                  onClick={async () => {
                    await deleteImportantDateAction(row.id);
                    router.refresh();
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <h3>{editing ? "Edit date" : "Add date"}</h3>
      <form className={styles["rolodex-search"]} onSubmit={onSubmit}>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="date-type">Type</label>
          <select
            id="date-type"
            name="type"
            defaultValue={editing?.type ?? "birthday"}
            key={editing?.id ?? "new-type"}
          >
            {DATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="date-month">Month</label>
          <input
            id="date-month"
            name="month"
            type="number"
            min={1}
            max={12}
            required
            defaultValue={editing?.month ?? ""}
            key={`${editing?.id ?? "new"}-month`}
          />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="date-day">Day</label>
          <input
            id="date-day"
            name="day"
            type="number"
            min={1}
            max={31}
            required
            defaultValue={editing?.day ?? ""}
            key={`${editing?.id ?? "new"}-day`}
          />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="date-year">Year (optional)</label>
          <input
            id="date-year"
            name="year"
            type="number"
            min={1900}
            defaultValue={editing?.year ?? ""}
            key={`${editing?.id ?? "new"}-year`}
          />
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="date-label">Label</label>
          <input
            id="date-label"
            name="label"
            defaultValue={editing?.label ?? ""}
            key={`${editing?.id ?? "new"}-label`}
          />
        </div>
        <button type="submit" disabled={pending}>
          Save
        </button>
        {editing ? (
          <button type="button" onClick={() => setEditing(null)}>
            Cancel
          </button>
        ) : null}
      </form>
    </section>
  );
}
