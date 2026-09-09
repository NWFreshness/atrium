"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
        <div>
          <strong>{overdueCount}</strong>
          <span>overdue to contact</span>
        </div>
        <div>
          <strong>{dueSoonCount}</strong>
          <span>due within a week</span>
        </div>
        <div>
          <strong>{data.upcomingDates.length}</strong>
          <span>dates in 30 days</span>
        </div>
        <div>
          <strong>{data.dueReminders.length}</strong>
          <span>reminders due</span>
        </div>
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
            {data.whoToContact.map((row) => (
              <li key={row.id} className={styles["rolodex-today-hero-row"]}>
                <Link href={`/rolodex/people/${row.id}`}>
                  <Initials name={row.name} />
                  <span>
                    <strong>{row.name}</strong>
                    <span>
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
                      : styles["rolodex-today-due"]
                  }
                >
                  {urgency(row)}
                </span>
                <button
                  type="button"
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
