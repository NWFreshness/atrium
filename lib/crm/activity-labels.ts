/**
 * Visible label helpers for activity rows.
 *
 * Every per-row control (Edit, Delete, the done checkbox) is named after the
 * activity's description, and a 60-character accessible name is the longest
 * that survives a typical screen reader's spoken-buffer line. The truncation
 * is centralised here so a future 11.x feature that names another control
 * uses the same shape and does not silently desynchronise.
 */
export const LAST_CONTACTED_STALE_DAYS = 30;

/**
 * Returns `value` unchanged if it fits in 60 characters, otherwise the first
 * 60 characters followed by `…` (a single Unicode horizontal-ellipsis
 * character, not three dots). An empty string returns empty.
 */
export function truncateActivityLabel(value: string): string {
  if (value.length <= 60) {
    return value;
  }
  return value.slice(0, 60) + "…";
}
