import Link from "next/link";
import { CalendarMonth } from "@/components/rolodex/calendar-month";
import calStyles from "@/components/rolodex/calendar-month.module.css";
import pageStyles from "@/components/rolodex/rolodex-subnav.module.css";
import { listMonthDatesAction } from "@/lib/rolodex/date-actions";
import { shiftMonth, todayISO } from "@/lib/rolodex/dates";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function RolodexCalendarPage({
  searchParams,
}: PageProps<"/rolodex/calendar">) {
  const { year: rawYear, month: rawMonth } = await searchParams;
  const today = todayISO();
  const [todayYear, todayMonth] = today.split("-").map(Number) as [
    number,
    number,
  ];
  const year =
    Number(Array.isArray(rawYear) ? rawYear[0] : rawYear) || todayYear;
  const month =
    Number(Array.isArray(rawMonth) ? rawMonth[0] : rawMonth) || todayMonth;
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const entries = await listMonthDatesAction(year, month);

  return (
    <main className={pageStyles["rolodex-page"]}>
      <h1>Calendar</h1>
      <div className={calStyles.nav}>
        <Link href={`/rolodex/calendar?year=${prev.year}&month=${prev.month}`}>
          Previous
        </Link>
        <strong>
          {MONTH_NAMES[month - 1]} {year}
        </strong>
        <Link href={`/rolodex/calendar?year=${next.year}&month=${next.month}`}>
          Next
        </Link>
      </div>
      <CalendarMonth year={year} month={month} entries={entries} />
    </main>
  );
}
