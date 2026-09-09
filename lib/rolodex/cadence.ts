import {
  CIRCLE_META,
  DUE_SOON_WINDOW_DAYS,
  type CheckInStatus,
  type Circle,
} from "./constants";
import { addDaysISO, daysBetweenISO, todayISO } from "./dates";

export type CadencePerson = {
  circle: Circle;
  cadenceOverrideDays: number | null;
  checkinsOff: boolean;
  snoozedUntil: string | null;
};

export function cadenceDays(person: CadencePerson): number | null {
  if (person.checkinsOff) {
    return null;
  }
  if (person.cadenceOverrideDays != null && person.cadenceOverrideDays > 0) {
    return person.cadenceOverrideDays;
  }
  return CIRCLE_META[person.circle].cadenceDays;
}

export type StatusResult = {
  status: CheckInStatus;
  nextDue: string | null;
  daysOverdue: number;
};

export function computeStatus(
  person: CadencePerson,
  lastContacted: string | null,
  today: string = todayISO(),
): StatusResult {
  if (person.checkinsOff) {
    return { status: "off", nextDue: null, daysOverdue: 0 };
  }

  if (person.snoozedUntil && daysBetweenISO(today, person.snoozedUntil) >= 0) {
    return { status: "snoozed", nextDue: null, daysOverdue: 0 };
  }

  const days = cadenceDays(person);
  if (days == null) {
    return { status: "off", nextDue: null, daysOverdue: 0 };
  }

  const nextDue = lastContacted ? addDaysISO(lastContacted, days) : today;
  const diff = daysBetweenISO(today, nextDue);
  if (diff < 0) {
    return { status: "overdue", nextDue, daysOverdue: -diff };
  }
  if (diff <= DUE_SOON_WINDOW_DAYS) {
    return { status: "due_soon", nextDue, daysOverdue: 0 };
  }
  return { status: "in_touch", nextDue, daysOverdue: 0 };
}
