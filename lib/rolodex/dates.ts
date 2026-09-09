const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function parseISODate(iso: string): Date {
  const match = ISO.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toISO(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toISO(date);
}

export function daysBetweenISO(fromISO: string, toISO: string): number {
  const from = parseISODate(fromISO);
  const to = parseISODate(toISO);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function effectiveDay(month: number, day: number, year: number): number {
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    return 28;
  }
  return day;
}

export type Occurrence = {
  date: string;
  years: number | null;
  ageTurning: number | null;
  milestone: boolean;
};

export function nextOccurrence(
  date: { month: number; day: number; year?: number | null },
  fromISO: string = todayISO(),
): Occurrence {
  const fromDate = parseISODate(fromISO);
  const currentYear = fromDate.getUTCFullYear();

  for (const year of [currentYear, currentYear + 1]) {
    const day = effectiveDay(date.month, date.day, year);
    const occurrence = toISO(new Date(Date.UTC(year, date.month - 1, day)));
    if (daysBetweenISO(fromISO, occurrence) >= 0) {
      const ageTurning = date.year != null ? year - date.year : null;
      return {
        date: occurrence,
        years: ageTurning,
        ageTurning,
        milestone:
          ageTurning != null && ageTurning > 0 && ageTurning % 10 === 0,
      };
    }
  }
  throw new Error("Could not compute next occurrence");
}

export function currentAge(
  date: { month: number; day: number; year?: number | null },
  today: string = todayISO(),
): number | null {
  if (date.year == null) {
    return null;
  }
  const t = parseISODate(today);
  const year = t.getUTCFullYear();
  const day = effectiveDay(date.month, date.day, year);
  const thisYear = new Date(Date.UTC(year, date.month - 1, day));
  const lastOccurrenceYear = thisYear <= t ? year : year - 1;
  return lastOccurrenceYear - date.year;
}
