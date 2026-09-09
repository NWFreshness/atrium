"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CIRCLE_META, CIRCLES, type Circle } from "@/lib/rolodex/constants";
import {
  createPersonAction,
  updatePersonAction,
} from "@/lib/rolodex/person-actions";
import type { Person } from "@/lib/rolodex/queries";
import styles from "./people.module.css";

type PersonFormValues = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  company: string;
  city: string;
  timezone: string;
  circle: Circle;
  cadenceOverrideDays: string;
  checkinsOff: boolean;
  snoozedUntil: string;
  howMet: string;
  metWhere: string;
  metOn: string;
  notes: string;
  tags: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function valuesFromPerson(person?: Person | null): PersonFormValues {
  return {
    name: person?.name ?? "",
    email: person?.email ?? "",
    phone: person?.phone ?? "",
    jobTitle: person?.jobTitle ?? "",
    company: person?.company ?? "",
    city: person?.city ?? "",
    timezone: person?.timezone ?? "",
    circle: person?.circle ?? "close",
    cadenceOverrideDays:
      person?.cadenceOverrideDays != null
        ? String(person.cadenceOverrideDays)
        : "",
    checkinsOff: person?.checkinsOff ?? false,
    snoozedUntil: person?.snoozedUntil ?? "",
    howMet: person?.howMet ?? "",
    metWhere: person?.metWhere ?? "",
    metOn: person?.metOn ?? "",
    notes: person?.notes ?? "",
    tags: person?.tags.join(", ") ?? "",
  };
}

export function PersonForm({
  person,
  onClose,
}: {
  person?: Person | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<PersonFormValues>(
    valuesFromPerson(person),
  );
  const title = person ? `Edit ${person.name}` : "Add person";
  const titleId = "person-form-title";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      return;
    }
    const override = values.cadenceOverrideDays.trim();
    const input = {
      name,
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      jobTitle: emptyToNull(values.jobTitle),
      company: emptyToNull(values.company),
      city: emptyToNull(values.city),
      timezone: emptyToNull(values.timezone),
      circle: values.circle,
      cadenceOverrideDays: override === "" ? null : Number(override),
      checkinsOff: values.checkinsOff,
      snoozedUntil: emptyToNull(values.snoozedUntil),
      howMet: emptyToNull(values.howMet),
      metWhere: emptyToNull(values.metWhere),
      metOn: emptyToNull(values.metOn),
      notes: emptyToNull(values.notes),
      tags: parseTags(values.tags),
    };
    setPending(true);
    try {
      if (person) {
        await updatePersonAction(person.id, input);
      } else {
        await createPersonAction(input);
      }
      router.refresh();
      onClose();
    } finally {
      setPending(false);
    }
  }

  function setField<K extends keyof PersonFormValues>(
    key: K,
    value: PersonFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className={styles["rolodex-dialog-backdrop"]}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles["rolodex-dialog"]}
      >
        <h2 id={titleId}>{title}</h2>
        <form onSubmit={onSubmit}>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-name">Name</label>
            <input
              id="person-name"
              name="name"
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              required
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-email">Email</label>
            <input
              id="person-email"
              name="email"
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-phone">Phone</label>
            <input
              id="person-phone"
              name="phone"
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-job-title">Job title</label>
            <input
              id="person-job-title"
              name="jobTitle"
              value={values.jobTitle}
              onChange={(event) => setField("jobTitle", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-company">Company</label>
            <input
              id="person-company"
              name="company"
              value={values.company}
              onChange={(event) => setField("company", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-city">City</label>
            <input
              id="person-city"
              name="city"
              value={values.city}
              onChange={(event) => setField("city", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-timezone">Time zone</label>
            <input
              id="person-timezone"
              name="timezone"
              value={values.timezone}
              onChange={(event) => setField("timezone", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-circle">Circle</label>
            <select
              id="person-circle"
              name="circle"
              value={values.circle}
              onChange={(event) =>
                setField("circle", event.target.value as Circle)
              }
            >
              {CIRCLES.map((circle) => (
                <option key={circle} value={circle}>
                  {CIRCLE_META[circle].label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-cadence">Cadence override (days)</label>
            <input
              id="person-cadence"
              name="cadenceOverrideDays"
              type="number"
              min={1}
              value={values.cadenceOverrideDays}
              onChange={(event) =>
                setField("cadenceOverrideDays", event.target.value)
              }
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-checkins-off">
              <input
                id="person-checkins-off"
                name="checkinsOff"
                type="checkbox"
                checked={values.checkinsOff}
                onChange={(event) =>
                  setField("checkinsOff", event.target.checked)
                }
              />{" "}
              Check-ins off
            </label>
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-snooze">Snooze until</label>
            <input
              id="person-snooze"
              name="snoozedUntil"
              type="date"
              value={values.snoozedUntil}
              onChange={(event) => setField("snoozedUntil", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-how-met">How we met</label>
            <input
              id="person-how-met"
              name="howMet"
              value={values.howMet}
              onChange={(event) => setField("howMet", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-met-where">Where we met</label>
            <input
              id="person-met-where"
              name="metWhere"
              value={values.metWhere}
              onChange={(event) => setField("metWhere", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-met-on">Met on</label>
            <input
              id="person-met-on"
              name="metOn"
              type="date"
              value={values.metOn}
              onChange={(event) => setField("metOn", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-tags">Tags</label>
            <input
              id="person-tags"
              name="tags"
              value={values.tags}
              onChange={(event) => setField("tags", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="person-notes">Notes</label>
            <textarea
              id="person-notes"
              name="notes"
              rows={3}
              value={values.notes}
              onChange={(event) => setField("notes", event.target.value)}
            />
          </div>
          <div className={styles["rolodex-form-actions"]}>
            <button type="button" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" disabled={pending}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddPersonButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add person
      </button>
      {open ? <PersonForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function EditPersonButton({ person }: { person: Person }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Edit
      </button>
      {open ? (
        <PersonForm person={person} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
