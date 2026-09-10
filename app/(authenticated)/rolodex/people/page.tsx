import { ImportPeopleButton } from "@/components/rolodex/import-dialog";
import { AddPersonButton } from "@/components/rolodex/person-form";
import { PeopleTable } from "@/components/rolodex/people-table";
import styles from "@/components/rolodex/people.module.css";
import pageStyles from "@/components/rolodex/rolodex-subnav.module.css";
import { CIRCLE_META, CIRCLES, type Circle } from "@/lib/rolodex/constants";
import { listPeopleAction } from "@/lib/rolodex/person-actions";

function parseCircle(raw: string | string[] | undefined): Circle | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    typeof value === "string" &&
    (CIRCLES as readonly string[]).includes(value)
  ) {
    return value as Circle;
  }
  return undefined;
}

export default async function RolodexPeoplePage({
  searchParams,
}: PageProps<"/rolodex/people">) {
  const { q: rawQ, circle: rawCircle, tag: rawTag } = await searchParams;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const circle = parseCircle(rawCircle);
  const tag = Array.isArray(rawTag) ? rawTag[0] : rawTag;
  const [people, allPeople] = await Promise.all([
    listPeopleAction({ q, circle, tag: tag || undefined }),
    listPeopleAction(),
  ]);
  const tags = [...new Set(allPeople.flatMap((person) => person.tags))].sort();

  return (
    <main className={pageStyles["rolodex-page"]}>
      <div className="atrium-pagetitle">
        <h1>People</h1>
        <p className="atrium-sub">everyone you keep in touch with</p>
      </div>
      <div className={styles["rolodex-toolbar"]}>
        <form
          className={styles["rolodex-search"]}
          action="/rolodex/people"
          method="get"
        >
          <div className={styles["rolodex-field"]}>
            <label htmlFor="people-search">Search</label>
            <input id="people-search" name="q" defaultValue={q ?? ""} />
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="people-circle-filter">Circle</label>
            <select
              id="people-circle-filter"
              name="circle"
              defaultValue={circle ?? ""}
            >
              <option value="">All</option>
              {CIRCLES.map((value) => (
                <option key={value} value={value}>
                  {CIRCLE_META[value].label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["rolodex-field"]}>
            <label htmlFor="people-tag-filter">Tag</label>
            <select id="people-tag-filter" name="tag" defaultValue={tag ?? ""}>
              <option value="">All</option>
              {tags.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Search</button>
        </form>
        <AddPersonButton />
        <ImportPeopleButton />
      </div>
      <PeopleTable people={people} />
    </main>
  );
}
