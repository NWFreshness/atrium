import { DEAL_STAGES, type DealStage } from "./constants";

/**
 * 11.8 — the deals-page URL params, parsed where the page can use them.
 *
 * Client-safe on purpose: this module value-imports only `./constants`,
 * so a client component could share it without dragging the database
 * along (pinned by the source-grep case in `deal-params.test.ts`).
 * Unknown or malformed values come back `undefined` and the page treats
 * them as absent — never a 500.
 */

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export function parseStage(
  raw: string | string[] | undefined,
): DealStage | undefined {
  const value = first(raw);
  if (
    typeof value === "string" &&
    (DEAL_STAGES as readonly string[]).includes(value)
  ) {
    return value as DealStage;
  }
  return undefined;
}

const CLOSE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Strict `YYYY-MM-DD` (shape plus calendar round-trip) as UTC midnight.
 *
 * The trailing `Z` is load-bearing: without it `${text}T00:00:00` parses
 * as *local* time, and `toISOString()` then shifts the day by the
 * server's UTC offset — a filter for Sep 30 becomes Sep 29 or Oct 1.
 * `2026-02-31` never reaches the constructor's rollover because the
 * UTC-component check below rejects it first.
 */
export function parseCloseDate(
  raw: string | string[] | undefined,
): Date | undefined {
  const value = first(raw);
  if (typeof value !== "string") {
    return undefined;
  }
  const match = CLOSE_DATE_PATTERN.exec(value);
  if (!match) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() + 1 !== Number(match[2]) ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return undefined;
  }
  return date;
}

/**
 * The `closeBefore` the user picks is a calendar day and the day is
 * included, while the store comparison is half-open (`lt`). Adding one
 * day turns the inclusive picked day into the exclusive bound the
 * stores compare against. Returns the ISO string so the page hands the
 * stores a `Date` built from an unambiguous instant.
 */
export function closeBeforeExclusive(
  raw: string | string[] | undefined,
): string | undefined {
  const date = parseCloseDate(raw);
  if (!date) {
    return undefined;
  }
  return new Date(date.getTime() + DAY_MS).toISOString();
}
