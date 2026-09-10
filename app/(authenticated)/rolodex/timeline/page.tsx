import { TimelineList } from "@/components/rolodex/timeline-list";
import styles from "@/components/rolodex/people.module.css";
import pageStyles from "@/components/rolodex/rolodex-subnav.module.css";
import { listTimelineAction } from "@/lib/rolodex/log-actions";
import { listPeopleAction } from "@/lib/rolodex/person-actions";
import type { TimelineKind } from "@/lib/rolodex/timeline";

const KINDS: TimelineKind[] = ["interaction", "news", "reminder_done"];

function parseKind(
  raw: string | string[] | undefined,
): TimelineKind | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    typeof value === "string" &&
    (KINDS as readonly string[]).includes(value)
  ) {
    return value as TimelineKind;
  }
  return undefined;
}

export default async function RolodexTimelinePage({
  searchParams,
}: PageProps<"/rolodex/timeline">) {
  const { person: rawPerson, type: rawType } = await searchParams;
  const personId = Array.isArray(rawPerson) ? rawPerson[0] : rawPerson;
  const kind = parseKind(rawType);
  const [people, entries] = await Promise.all([
    listPeopleAction(),
    listTimelineAction({ personId: personId || undefined, kind }),
  ]);

  return (
    <main className={pageStyles["rolodex-page"]}>
      <div className="atrium-pagetitle">
        <h1>Timeline</h1>
        <p className="atrium-sub">interactions, news, and reminders</p>
      </div>
      <form
        className={styles["rolodex-search"]}
        action="/rolodex/timeline"
        method="get"
      >
        <div className={styles["rolodex-field"]}>
          <label htmlFor="timeline-person">Person</label>
          <select
            id="timeline-person"
            name="person"
            defaultValue={personId ?? ""}
          >
            <option value="">All</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles["rolodex-field"]}>
          <label htmlFor="timeline-type">Type</label>
          <select id="timeline-type" name="type" defaultValue={kind ?? ""}>
            <option value="">All</option>
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Filter</button>
      </form>
      <TimelineList entries={entries} showPerson />
    </main>
  );
}
