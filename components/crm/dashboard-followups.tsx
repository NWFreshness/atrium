"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleActivityDoneAction } from "@/lib/crm/activity-actions";
import { formatDate } from "@/lib/crm/format";
import type { Activity } from "@/lib/crm/queries";
import styles from "./dashboard.module.css";

function FollowUpList({
  items,
  empty,
}: {
  items: Activity[];
  empty: string;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onToggle(activity: Activity) {
    setPendingId(activity.id);
    try {
      await toggleActivityDoneAction(activity.id, !activity.done);
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.feedList}>
      {items.map((activity) => (
        <li key={activity.id} className={styles.feedItem}>
          <span>{activity.description}</span>
          <span className={styles.feedMeta}>
            Due {formatDate(activity.dueDate)}
          </span>
          <label>
            <input
              type="checkbox"
              checked={activity.done}
              disabled={pendingId === activity.id}
              aria-label={
                activity.done
                  ? `Mark ${activity.description} not done`
                  : `Mark ${activity.description} done`
              }
              onChange={() => {
                void onToggle(activity);
              }}
            />{" "}
            Done
          </label>
        </li>
      ))}
    </ul>
  );
}

export function DashboardFollowUps({
  overdue,
  upcoming,
}: {
  overdue: Activity[];
  upcoming: Activity[];
}) {
  return (
    <>
      <section className={styles.feed}>
        <h2 className={`${styles.feedTitle} ${styles.feedTitleLate}`}>
          Overdue
        </h2>
        <FollowUpList items={overdue} empty="No overdue follow-ups" />
      </section>
      <section className={styles.feed}>
        <h2 className={styles.feedTitle}>Upcoming</h2>
        <FollowUpList items={upcoming} empty="No upcoming follow-ups" />
      </section>
    </>
  );
}
