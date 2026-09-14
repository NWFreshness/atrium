"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Initials } from "@/components/rolodex/initials";
import { CIRCLE_META, DATE_TYPES } from "@/lib/rolodex/constants";
import type { RolodexDashboard } from "@/lib/rolodex/dashboard";
import {
  createInteractionAction,
  toggleReminderDoneAction,
} from "@/lib/rolodex/log-actions";
import { TodayCharts } from "./today-charts";
import styles from "./today.module.css";

const DATE_LABEL: Record<(typeof DATE_TYPES)[number], string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  work_anniversary: "Work anniversary",
  child_birthday: "Child's birthday",
  other: "Other",
};

function dateLabel(type: string, label: string | null): string {
  const named =
    type in DATE_LABEL ? DATE_LABEL[type as (typeof DATE_TYPES)[number]] : type;
  return label ? `${named} · ${label}` : named;
}

function summary(data: RolodexDashboard): string {
  if (data.whoToContact.length === 0) {
    return "everyone is in touch — go enjoy your day";
  }
  const top = data.whoToContact[0];
  if (top.status === "overdue") {
    return top.overdueDays
      ? `most overdue: ${top.name} · ${top.overdueDays} days`
      : `most overdue: ${top.name} · never contacted`;
  }
  const overdue = data.whoToContact.filter((row) => row.status === "overdue");
  return `${overdue.length} overdue · ${data.whoToContact.length - overdue.length} due soon`;
}

function urgency(row: RolodexDashboard["whoToContact"][number]): string {
  if (row.status !== "overdue") {
    return row.nextDue ? `due ${row.nextDue}` : "due soon";
  }
  return row.overdueDays > 0
    ? `${row.overdueDays} days overdue`
    : "never contacted";
}

export function TodayDashboard({ data }: { data: RolodexDashboard }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const overdueCount = data.whoToContact.filter(
    (row) => row.status === "overdue",
  ).length;
  const dueSoonCount = data.whoToContact.length - overdueCount;

  /*
    10.5 §4 — one highlight per screen. The list arrives sorted by cadence
    urgency (`lib/rolodex/dashboard`), so the first row is the one to do next:
    it alone takes the shared golden primary, and the first row that is merely
    due (rather than overdue) alone takes the golden chip. Every other row
    steps down to the neutral button and the moss or cedar chip.
  */
  const soonestDueId =
    data.whoToContact.find((row) => row.status !== "overdue")?.id ?? null;

  const tiles = [
    { label: "overdue to contact", value: overdueCount, accent: true },
    { label: "due within a week", value: dueSoonCount, accent: false },
    {
      label: "dates in 30 days",
      value: data.upcomingDates.length,
      accent: false,
    },
    { label: "reminders due", value: data.dueReminders.length, accent: false },
  ];

  async function logContact(personId: string) {
    setPending(personId);
    try {
      await createInteractionAction({
        personId,
        type: "call",
        date: data.today,
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function markReminderDone(id: string) {
    setPending(id);
    try {
      await toggleReminderDoneAction(id, true);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <p className={styles["rolodex-today-lede"]}>{data.today}</p>
      <div className={styles["rolodex-today-stats"]}>
        {tiles.map((tile, index) => (
          <div
            key={tile.label}
            className="reveal"
            style={{ "--i": index + 1 } as CSSProperties}
          >
            <div
              className={`atrium-kpi ${styles["rolodex-today-stat"]}`}
              style={{ "--kpi-c": "var(--stat-c)" } as CSSProperties}
            >
              <div className="atrium-label">{tile.label}</div>
              <div
                className={
                  tile.accent ? "atrium-kpi-value accent" : "atrium-kpi-value"
                }
              >
                {tile.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className={styles["rolodex-today-hero"]}>
        <div className={styles["rolodex-today-hero-head"]}>
          <h2>Who to contact</h2>
          <p>{summary(data)}</p>
        </div>
        {data.whoToContact.length === 0 ? (
          <p className={styles["rolodex-today-empty"]}>
            Nobody needs your attention right now. Everyone is inside their
            check-in window — have a look at the{" "}
            <Link href="/rolodex/circles">Circles board</Link> if you fancy
            getting ahead.
          </p>
        ) : (
          <ul className={styles["rolodex-today-hero-list"]}>
            {data.whoToContact.map((row, index) => (
              <li
                key={row.id}
                className={`${styles["rolodex-today-hero-row"]} reveal`}
                style={{ "--i": index + 1 } as CSSProperties}
              >
                <Link href={`/rolodex/people/${row.id}`}>
                  <Initials name={row.name} />
                  <span className={styles["rolodex-today-who"]}>
                    <strong>{row.name}</strong>
                    <span className={styles["rolodex-today-cadence"]}>
                      {CIRCLE_META[row.circle].label}
                      {" · "}
                      {row.lastContacted
                        ? `last contacted ${row.lastContacted}`
                        : "never contacted"}
                      {row.latestNews ? ` · ${row.latestNews.text}` : ""}
                    </span>
                  </span>
                </Link>
                <span
                  className={
                    row.status === "overdue"
                      ? styles["rolodex-today-overdue"]
                      : row.id === soonestDueId
                        ? styles["rolodex-today-due"]
                        : styles["rolodex-today-soon"]
                  }
                >
                  {urgency(row)}
                </span>
                <button
                  type="button"
                  className={
                    index === 0 ? "atrium-btn atrium-btn-primary" : "atrium-btn"
                  }
                  disabled={pending === row.id}
                  onClick={() => void logContact(row.id)}
                >
                  Log contact
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={styles["rolodex-today-grid"]}>
        <section className={styles["rolodex-today-panel"]}>
          <h2>Dates coming up</h2>
          {data.upcomingDates.length === 0 ? (
            <p className={styles["rolodex-today-empty"]}>
              No birthdays or important dates in the next 30 days.
            </p>
          ) : (
            <ul>
              {data.upcomingDates.map((row) => (
                <li key={`${row.id}-${row.date}`}>
                  <Link href={`/rolodex/people/${row.personId}`}>
                    {row.date} · {row.personName} ·{" "}
                    {dateLabel(row.type, row.label)}
                    {row.ageTurning != null ? ` · turns ${row.ageTurning}` : ""}
                    {row.milestone ? " · milestone" : ""}
                    {row.daysAway === 0 ? " · today" : ` · ${row.daysAway}d`}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles["rolodex-today-panel"]}>
          <h2>Reminders</h2>
          {data.dueReminders.length === 0 ? (
            <p className={styles["rolodex-today-empty"]}>
              No reminders due — nothing on your list.
            </p>
          ) : (
            <ul>
              {data.dueReminders.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="atrium-btn"
                    aria-label={`Mark done: ${row.text}`}
                    disabled={pending === row.id}
                    onClick={() => void markReminderDone(row.id)}
                  >
                    Done
                  </button>{" "}
                  {row.text} ·{" "}
                  <Link href={`/rolodex/people/${row.personId}`}>
                    {row.personName}
                  </Link>{" "}
                  · due {row.dueDate}
                  {row.overdue ? " · overdue" : ""}
                  {row.dueToday ? " · today" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TodayCharts
        months={data.interactionsPerMonth}
        circles={data.peoplePerCircle}
      />

      <section className={styles["rolodex-today-panel"]}>
        <h2>Recent activity</h2>
        {data.recentActivity.length === 0 ? (
          <p className={styles["rolodex-today-empty"]}>
            Nothing logged yet — record an interaction and it will show up here.
          </p>
        ) : (
          <ul>
            {data.recentActivity.map((row) => (
              <li key={row.id}>
                <Link href={`/rolodex/people/${row.personId}`}>
                  {row.personName}
                </Link>{" "}
                · {row.kind} · {row.date}
                {row.text ? ` · ${row.text}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
