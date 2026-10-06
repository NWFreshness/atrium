/**
 * The activity sorter, lifted out of `queries-shared.ts` so a client
 * component can reach it without dragging the database barrel into the
 * graph walk in `lib/client-boundary.test.ts`. The implementation is
 * identical to `compareActivitiesNewestFirst` and both copies must stay in
 * sync — the `last-contacted` unit test pins the contract.
 *
 * Order: `occurredAt DESC` (nulls last), then `createdAt DESC`, then `id`
 * ascending as a stable tie-breaker.
 */
export function compareActivitiesNewestFirst<
  T extends {
    occurredAt?: Date | null;
    createdAt: Date;
    id: string;
  },
>(a: T, b: T): number {
  const aOccurred = a.occurredAt?.getTime();
  const bOccurred = b.occurredAt?.getTime();
  if (aOccurred != null && bOccurred != null && aOccurred !== bOccurred) {
    return bOccurred - aOccurred;
  }
  if (aOccurred != null && bOccurred == null) {
    return -1;
  }
  if (aOccurred == null && bOccurred != null) {
    return 1;
  }
  const created = b.createdAt.getTime() - a.createdAt.getTime();
  if (created !== 0) {
    return created;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
