"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { moveCardAction, reorderRowsAction } from "@/lib/space/view-actions";
import {
  groupRows,
  type BoardColumn,
  type ViewProperty,
  type ViewRow,
} from "@/lib/space/view-logic";
import styles from "./board-view.module.css";

const NONE = "none";

function columnId(optionId: string | null): string {
  return `col:${optionId ?? NONE}`;
}

function optionIdFromColumn(id: string): string | null {
  const raw = id.slice("col:".length);
  return raw === NONE ? null : raw;
}

function isColumnId(id: string): boolean {
  return id.startsWith("col:");
}

function containerOf(columns: BoardColumn[], id: string): string | null {
  if (isColumnId(id)) {
    return id;
  }
  const column = columns.find((item) => item.rows.some((row) => row.id === id));
  return column ? columnId(column.option?.id ?? null) : null;
}

function permuteIds(
  allIds: string[],
  previous: string[],
  next: string[],
): string[] {
  const moving = new Set(previous);
  const queue = [...next];
  return allIds.map((id) => (moving.has(id) ? queue.shift()! : id));
}

const collisionDetection: CollisionDetection = (args) => {
  if (args.active.data.current?.type === "column") {
    return closestCenter(args);
  }
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : closestCenter(args);
};

function titleOf(row: ViewRow): string {
  return row.title.trim() === "" ? "Untitled" : row.title;
}

function BoardCard({ row }: { row: ViewRow }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
    data: { type: "card" },
  });
  return (
    <article
      ref={setNodeRef}
      className={styles["space-board-card"]}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <button
        type="button"
        className={styles["space-board-grip"]}
        aria-label={`Drag ${titleOf(row)}`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <Link
        className={styles["space-board-card-title"]}
        href={`/space/${row.id}`}
      >
        {titleOf(row)}
      </Link>
    </article>
  );
}

function Column({ column }: { column: BoardColumn }) {
  const id = columnId(column.option?.id ?? null);
  const { setNodeRef } = useDroppable({
    id,
    data: { type: "column" },
  });
  return (
    <section className={styles["space-board-column"]}>
      <header className={styles["space-board-column-header"]}>
        <h2>{column.option?.name ?? "No value"}</h2>
        <span className={styles["space-board-count"]}>
          {column.rows.length}
        </span>
      </header>
      <div ref={setNodeRef} className={styles["space-board-list"]}>
        <SortableContext
          items={column.rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.rows.map((row) => (
            <BoardCard key={row.id} row={row} />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

export function BoardView({
  databaseId,
  rows,
  groupProperty,
  allRowIds,
}: {
  databaseId: string;
  rows: ViewRow[];
  groupProperty: ViewProperty;
  allRowIds: string[];
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const grouped = useMemo(
    () => groupRows(rows, groupProperty),
    [rows, groupProperty],
  );
  const [columns, setColumns] = useState(grouped);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const [activeRow, setActiveRow] = useState<ViewRow | null>(null);
  const [originColumnId, setOriginColumnId] = useState<string | null>(null);

  useEffect(() => {
    if (activeRow) {
      return;
    }
    setColumns(grouped);
  }, [grouped, activeRow]);

  function onDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const current = columnsRef.current;
    const row = current
      .flatMap((column) => column.rows)
      .find((item) => item.id === id);
    setActiveRow(row ?? null);
    setOriginColumnId(containerOf(current, id));
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    setColumns((current) => {
      const from = containerOf(current, activeId);
      const to = containerOf(current, overId);
      if (!from || !to || from === to) {
        return current;
      }
      const source = current.find(
        (column) => columnId(column.option?.id ?? null) === from,
      );
      const dest = current.find(
        (column) => columnId(column.option?.id ?? null) === to,
      );
      if (!source || !dest) {
        return current;
      }
      const row = source.rows.find((item) => item.id === activeId);
      if (!row) {
        return current;
      }
      const overIndex = dest.rows.findIndex((item) => item.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : dest.rows.length;
      return current.map((column) => {
        const key = columnId(column.option?.id ?? null);
        if (key === from) {
          return {
            ...column,
            rows: column.rows.filter((item) => item.id !== activeId),
          };
        }
        if (key === to) {
          const next = column.rows.filter((item) => item.id !== activeId);
          next.splice(insertAt, 0, row);
          return { ...column, rows: next };
        }
        return column;
      });
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeId = String(active.id);
    const origin = originColumnId;
    const current = columnsRef.current;
    setActiveRow(null);
    setOriginColumnId(null);
    if (!over || !origin) {
      setColumns(grouped);
      return;
    }
    const dest = containerOf(current, String(over.id)) ?? origin;
    if (dest !== origin) {
      await moveCardAction({
        rowId: activeId,
        propertyId: groupProperty.id,
        optionId: optionIdFromColumn(dest),
      });
      router.refresh();
      return;
    }
    const column = current.find(
      (item) => columnId(item.option?.id ?? null) === dest,
    );
    if (!column) {
      return;
    }
    const oldIndex = column.rows.findIndex((row) => row.id === activeId);
    const overIndex = column.rows.findIndex(
      (row) => row.id === String(over.id),
    );
    if (oldIndex < 0 || overIndex < 0 || oldIndex === overIndex) {
      return;
    }
    const reordered = arrayMove(column.rows, oldIndex, overIndex);
    const previous = grouped.find(
      (item) => columnId(item.option?.id ?? null) === dest,
    );
    if (!previous) {
      return;
    }
    const orderedIds = permuteIds(
      allRowIds,
      previous.rows.map((row) => row.id),
      reordered.map((row) => row.id),
    );
    setColumns((current) =>
      current.map((item) =>
        columnId(item.option?.id ?? null) === dest
          ? { ...item, rows: reordered }
          : item,
      ),
    );
    await reorderRowsAction(databaseId, orderedIds);
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveRow(null);
        setOriginColumnId(null);
        setColumns(grouped);
      }}
    >
      <div className={styles["space-board"]}>
        {columns.map((column) => (
          <Column key={columnId(column.option?.id ?? null)} column={column} />
        ))}
      </div>
      <DragOverlay>
        {activeRow ? (
          <article className={styles["space-board-overlay"]}>
            <span className={styles["space-board-grip"]}>⋮⋮</span>
            <span className={styles["space-board-card-title"]}>
              {titleOf(activeRow)}
            </span>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
