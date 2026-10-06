import { compareActivitiesNewestFirst } from "./activity-sort";
import { LAST_CONTACTED_STALE_DAYS } from "./activity-labels";
import type { Activity } from "./queries-shared";

/**
 * The most recent activity, by `occurredAt` and then `createdAt`, or `null`
 * if the list is empty. Dated activities win over undated ones; that is
 * already what `compareActivitiesNewestFirst` does, so this is a single sort
 * + first-element pick that scans the whole list and is robust to a future
 * change in the comparator.
 */
export function lastContactedAt(activities: Activity[]): Activity | null {
  if (activities.length === 0) {
    return null;
  }
  const sorted = [...activities].sort(compareActivitiesNewestFirst);
  return sorted[0] ?? null;
}

const MS_PER_DAY = 86_400_000;

/**
 * Whole-day floor between `contactedAt` and `now`. `null` if no contact.
 * The floor means "later today" reports 0, not 1; a 12-hour-old contact on
 * the day boundary is not yet a day.
 */
export function daysSinceContacted(
  contactedAt: Date | null,
  now: Date = new Date(),
): number | null {
  if (!contactedAt) {
    return null;
  }
  const diff = now.getTime() - contactedAt.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.floor(diff / MS_PER_DAY);
}

/**
 * Stale means strictly older than the threshold. Exactly `LAST_CONTACTED_STALE_DAYS`
 * days is still fresh — the off-by-one lives here and is the named red in AC5.
 * `null` (no contact yet) is treated as fresh; "Never" does not render a stale
 * badge.
 */
export function isStaleContacted(
  contactedAt: Date | null,
  now: Date = new Date(),
): boolean {
  const days = daysSinceContacted(contactedAt, now);
  if (days === null) {
    return false;
  }
  return days > LAST_CONTACTED_STALE_DAYS;
}
