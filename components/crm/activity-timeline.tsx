"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleActivityDoneAction } from "@/lib/crm/activity-actions";
import type { ActivityType } from "@/lib/crm/constants";
import { formatDate } from "@/lib/crm/format";
import type { Activity } from "@/lib/crm/queries";
import styles from "./org.module.css";

function TypeIcon({ type }: { type: ActivityType }) {
  if (type === "call") {
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
        <path
          fill="currentColor"
          d="M3.2 1.5h2.1l1.1 2.7-1.3 1.3a9 9 0 0 0 4.4 4.4l1.3-1.3 2.7 1.1v2.1c0 .6-.5 1.2-1.1 1.2A11.3 11.3 0 0 1 2 2.6c0-.6.6-1.1 1.2-1.1z"
        />
      </svg>
    );
  }
  if (type === "email") {
    return (
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
        <path
          fill="currentColor"
          d="M1.5 3.5h13v9h-13zm1.2 1.2 5.3 3.6 5.3-3.6M2.7 11.3V6.4L8 9.9l5.3-3.5v4.9z"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
      <path
        fill="currentColor"
        d="M3 1.5h8.5L13.5 4v10.5H3zm1.5 1.5v10h7.5V4.8H10V3zM5.5 7h5v1.2h-5zm0 2.5h5v1.2h-5z"
      />
    </svg>
  );
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
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

  if (activities.length === 0) {
    return <p className={styles["crm-empty"]}>No activities</p>;
  }

  return (
    <ul>
      {activities.map((activity) => (
        <li key={activity.id}>
          <TypeIcon type={activity.type} /> {activity.type}
          <p>{activity.description}</p>
          <p>
            {formatDate(activity.occurredAt)}
            {activity.dueDate ? ` · Due ${formatDate(activity.dueDate)}` : ""}
          </p>
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
