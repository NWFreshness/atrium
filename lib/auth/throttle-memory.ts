import type { ThrottleRow, ThrottleStore } from "./throttle";

export function createMemoryThrottleStore(): ThrottleStore {
  const rows = new Map<string, ThrottleRow>();
  return {
    async get(subject) {
      const row = rows.get(subject);
      return row
        ? { ...row, windowStartedAt: new Date(row.windowStartedAt) }
        : null;
    },
    async put(row) {
      rows.set(row.subject, {
        ...row,
        windowStartedAt: new Date(row.windowStartedAt),
      });
    },
    async delete(subject) {
      rows.delete(subject);
    },
  };
}
