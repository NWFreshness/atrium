import Link from "next/link";
import { daysInMonth, type MonthDate } from "@/lib/rolodex/dates";
import styles from "./calendar-month.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonth({
  year,
  month,
  entries,
}: {
  year: number;
  month: number;
  entries: MonthDate[];
}) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const length = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const byDay = new Map<number, MonthDate[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.day) ?? [];
    list.push(entry);
    byDay.set(entry.day, list);
  }

  return (
    <div className={styles.grid}>
      {WEEKDAYS.map((day) => (
        <div key={day} className={styles.weekday}>
          {day}
        </div>
      ))}
      {cells.map((day, index) => (
        <div key={index} className={styles.cell}>
          {day != null ? <span className={styles.day}>{day}</span> : null}
          {(day != null ? byDay.get(day) : undefined)?.map((entry) => (
            <Link
              key={entry.id}
              className={styles.entry}
              href={`/rolodex/people/${entry.personId}`}
            >
              {entry.personName}
              {entry.milestone ? " · milestone" : ""}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
