import { CIRCLES } from "./constants";
import type { PersonComputed } from "./queries";

/**
 * Per-circle counts for the board's column headers.
 *
 * It lives in its own module because `circles-board.tsx` is a client component:
 * it used to be exported from `move-person.ts`, which value-imports `queries.ts`
 * and therefore put Drizzle in the circles chunk. The `PersonComputed` import
 * above is type-only, which is erased at build time and enforced as a *kind* by
 * `lib/client-boundary.test.ts` — drop the `type` and that gate fails, naming
 * this file. Same convention as the board and the rest of the app, which take
 * these types from the barrel.
 */
export function circleColumnStats(people: PersonComputed[]) {
  return CIRCLES.map((circle) => {
    const column = people.filter((person) => person.circle === circle);
    return {
      circle,
      count: column.length,
      overdue: column.filter((person) => person.status === "overdue").length,
    };
  });
}
