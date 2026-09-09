"use client";

import Link from "next/link";
import type { TimelineEntry } from "@/lib/rolodex/timeline";
import styles from "./people.module.css";

const KIND_LABEL = {
  interaction: "Interaction",
  news: "News",
  reminder_done: "Reminder done",
} as const;

export function TimelineList({
  entries,
  showPerson = false,
}: {
  entries: TimelineEntry[];
  showPerson?: boolean;
}) {
  if (entries.length === 0) {
    return <p className={styles["rolodex-empty"]}>No timeline entries</p>;
  }

  return (
    <ul className={styles["rolodex-log-list"]}>
      {entries.map((entry) => (
        <li key={entry.id} className={styles["rolodex-log-item"]}>
          <span className={styles["rolodex-log-kind"]}>
            {entry.kind === "interaction" && entry.interactionType
              ? entry.interactionType
              : KIND_LABEL[entry.kind]}
          </span>
          {showPerson ? (
            <>
              {" "}
              <Link
                className={styles["rolodex-table-link"]}
                href={`/rolodex/people/${entry.personId}`}
              >
                {entry.personName}
              </Link>
            </>
          ) : null}
          <p>{entry.text}</p>
          <p className={styles["rolodex-log-date"]}>{entry.date}</p>
        </li>
      ))}
    </ul>
  );
}
