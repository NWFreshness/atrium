"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Initials } from "@/components/rolodex/initials";
import {
  CIRCLE_META,
  CIRCLES,
  type CheckInStatus,
  type Circle,
} from "@/lib/rolodex/constants";
import { circleColumnStats } from "@/lib/rolodex/circle-stats";
import { movePersonCircleAction } from "@/lib/rolodex/person-actions";
import type { PersonComputed } from "@/lib/rolodex/queries";
import styles from "./circles-board.module.css";
import peopleStyles from "./people.module.css";

const COLUMN_CLASS: Record<Circle, string> = {
  inner: styles.columnInner,
  close: styles.columnClose,
  wider: styles.columnWider,
  distant: styles.columnDistant,
};

const STATUS_LABEL: Record<CheckInStatus, string> = {
  in_touch: "In touch",
  due_soon: "Due soon",
  overdue: "Overdue",
  snoozed: "Snoozed",
  off: "Off",
};

function peopleInCircle(
  people: PersonComputed[],
  circle: Circle,
): PersonComputed[] {
  return people.filter((person) => person.circle === circle);
}

export function CirclesBoard({
  people: initialPeople,
}: {
  people: PersonComputed[];
}) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);

  useEffect(() => {
    setPeople(initialPeople);
  }, [initialPeople]);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }
    const circle = result.destination.droppableId as Circle;
    if (!(CIRCLES as readonly string[]).includes(circle)) {
      return;
    }
    setPeople((current) =>
      current.map((person) =>
        person.id === result.draggableId ? { ...person, circle } : person,
      ),
    );
    await movePersonCircleAction(result.draggableId, circle);
    router.refresh();
  }

  const stats = circleColumnStats(people);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={styles.board}>
        {CIRCLES.map((circle) => {
          const columnPeople = peopleInCircle(people, circle);
          const columnStats = stats.find((row) => row.circle === circle);
          return (
            <section
              key={circle}
              className={`${styles.column} ${COLUMN_CLASS[circle]}`}
            >
              <header className={styles.columnHeader}>
                <h2 className={styles.columnName}>
                  {CIRCLE_META[circle].label}
                </h2>
                <p className={styles.columnTotals}>
                  {columnStats?.count ?? 0} people · {columnStats?.overdue ?? 0}{" "}
                  overdue
                </p>
              </header>
              <Droppable droppableId={circle}>
                {(provided) => (
                  <div
                    className={styles.list}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {columnPeople.map((person, index) => (
                      <Draggable
                        key={person.id}
                        draggableId={person.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <article
                            className={styles.card}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <Initials name={person.name} />
                            <div className={styles.cardBody}>
                              <Link
                                className={styles.cardName}
                                href={`/rolodex/people/${person.id}`}
                              >
                                {person.name}
                              </Link>
                              <p className={styles.cardMeta}>
                                {person.lastContacted ?? "Never contacted"}
                              </p>
                              <p
                                className={`${peopleStyles["rolodex-status"]} ${peopleStyles[`rolodex-status-${person.status}`]}`}
                              >
                                {STATUS_LABEL[person.status]}
                              </p>
                            </div>
                          </article>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </section>
          );
        })}
      </div>
    </DragDropContext>
  );
}
