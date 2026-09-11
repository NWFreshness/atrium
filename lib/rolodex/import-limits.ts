/**
 * Import size and field ceilings. Data only — no value imports — so a client
 * file can read the numbers later without pulling Papa or queries.
 */

export const MAX_IMPORT_CHARS = 1_000_000;
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_SHORT_FIELD = 500;
export const MAX_IMPORT_NOTES = 8_000;

export const IMPORT_TOO_LARGE = "That file is too large.";
