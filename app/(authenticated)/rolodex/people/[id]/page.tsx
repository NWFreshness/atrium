import { notFound } from "next/navigation";
import { Initials } from "@/components/rolodex/initials";
import { EditPersonButton } from "@/components/rolodex/person-form";
import styles from "@/components/rolodex/people.module.css";
import pageStyles from "@/components/rolodex/rolodex-subnav.module.css";
import { CIRCLE_META } from "@/lib/rolodex/constants";
import { PersonLog } from "@/components/rolodex/person-log";
import { todayISO } from "@/lib/rolodex/dates";
import { PersonDates } from "@/components/rolodex/person-dates";
import { listImportantDatesAction } from "@/lib/rolodex/date-actions";
import { listPersonLogAction } from "@/lib/rolodex/log-actions";
import { getPersonAction } from "@/lib/rolodex/person-actions";

const STATUS_LABEL = {
  in_touch: "In touch",
  due_soon: "Due soon",
  overdue: "Overdue",
  snoozed: "Snoozed",
  off: "Off",
} as const;

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const person = await getPersonAction(id);
  if (!person) {
    notFound();
  }
  const log = await listPersonLogAction(id);
  const dates = await listImportantDatesAction(id);

  return (
    <main className={pageStyles["rolodex-page"]}>
      <div className={styles["rolodex-person-head"]}>
        <Initials name={person.name} large />
        <h1>{person.name}</h1>
        <EditPersonButton person={person} />
      </div>
      <dl className={styles["rolodex-detail"]}>
        <dt>Email</dt>
        <dd>{person.email ?? ""}</dd>
        <dt>Phone</dt>
        <dd>{person.phone ?? ""}</dd>
        <dt>Job title</dt>
        <dd>{person.jobTitle ?? ""}</dd>
        <dt>Company</dt>
        <dd>{person.company ?? ""}</dd>
        <dt>City</dt>
        <dd>{person.city ?? ""}</dd>
        <dt>Time zone</dt>
        <dd>{person.timezone ?? ""}</dd>
        <dt>Circle</dt>
        <dd>{CIRCLE_META[person.circle].label}</dd>
        <dt>Last contacted</dt>
        <dd>{person.lastContacted ?? ""}</dd>
        <dt>Status</dt>
        <dd>{STATUS_LABEL[person.status]}</dd>
        <dt>Cadence override</dt>
        <dd>
          {person.cadenceOverrideDays != null
            ? `${person.cadenceOverrideDays} days`
            : ""}
        </dd>
        <dt>Check-ins</dt>
        <dd>{person.checkinsOff ? "Off" : "On"}</dd>
        <dt>Snooze until</dt>
        <dd>{person.snoozedUntil ?? ""}</dd>
        <dt>How we met</dt>
        <dd>{person.howMet ?? ""}</dd>
        <dt>Where we met</dt>
        <dd>{person.metWhere ?? ""}</dd>
        <dt>Met on</dt>
        <dd>{person.metOn ?? ""}</dd>
        <dt>Tags</dt>
        <dd>{person.tags.join(", ")}</dd>
        <dt>Notes</dt>
        <dd>{person.notes ?? ""}</dd>
        <dt>Latest news</dt>
        <dd>{person.latestNews?.text ?? ""}</dd>
      </dl>
      <PersonDates personId={person.id} dates={dates} today={todayISO()} />
      <PersonLog
        personId={person.id}
        facts={log.facts}
        reminders={log.reminders}
        timeline={log.timeline}
        today={todayISO()}
      />
    </main>
  );
}
