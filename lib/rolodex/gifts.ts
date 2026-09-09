import { GIFT_IDEA_WINDOW_DAYS } from "./constants";
import { daysBetweenISO, nextOccurrence } from "./dates";
import type { Gift, ImportantDate } from "./queries";

export function giftIdeasToSurface(
  gifts: Gift[],
  dates: ImportantDate[],
  today: string,
): Gift[] {
  const upcoming = dates.some((date) => {
    const days = daysBetweenISO(today, nextOccurrence(date, today).date);
    return days >= 0 && days <= GIFT_IDEA_WINDOW_DAYS;
  });
  if (!upcoming) {
    return [];
  }
  return gifts.filter((gift) => gift.kind === "idea");
}
