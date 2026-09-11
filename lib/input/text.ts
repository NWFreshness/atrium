export const MAX_SHORT_TEXT = 500;
export const MAX_LONG_TEXT = 8_000;
export const MAX_BLOCK_TEXT = 20_000;

/**
 * Validate untrusted text to a length contract. Nullish stays nullish.
 * Callers that already trim keep doing so; this does not trim.
 */
export function assertText(
  value: unknown,
  max: number,
): string | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "string") {
    throw new Error("invalid text");
  }
  if (value.length > max) {
    throw new Error("text too long");
  }
  return value;
}

/**
 * Escape `\`, `%`, and `_` for Postgres ILIKE so a user term is literal.
 * Pair with `ESCAPE '\'` in the SQL (see CRM drizzle search).
 */
export function escapeIlike(term: string): string {
  return term
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}
