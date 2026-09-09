import { CirclesBoard } from "@/components/rolodex/circles-board";
import pageStyles from "@/components/rolodex/rolodex-subnav.module.css";
import { listPeopleAction } from "@/lib/rolodex/person-actions";

export default async function RolodexCirclesPage() {
  const people = await listPeopleAction();

  return (
    <main className={pageStyles["rolodex-page"]}>
      <h1>Circles</h1>
      <CirclesBoard people={people} />
    </main>
  );
}
