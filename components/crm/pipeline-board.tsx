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
import {
  DEAL_STAGES,
  expectedValue,
  STAGE_PROBABILITY,
  type DealStage,
} from "@/lib/crm/constants";
import { moveDealAction } from "@/lib/crm/deal-actions";
import { formatMoney } from "@/lib/crm/format";
import { columnTotals, sumExpected, sumValue } from "@/lib/crm/pipeline-metrics";
import type { Deal } from "@/lib/crm/queries";
import styles from "./pipeline-board.module.css";

const STAGE_CLASS: Record<DealStage, string> = {
  New: styles.stageNew,
  Qualified: styles.stageQualified,
  Proposal: styles.stageProposal,
  Negotiation: styles.stageNegotiation,
  Won: styles.stageWon,
  Lost: styles.stageLost,
};

function byBoardOrderThenId(left: Deal, right: Deal): number {
  if (left.boardOrder !== right.boardOrder) {
    return left.boardOrder - right.boardOrder;
  }
  return left.id.localeCompare(right.id);
}

function dealsInStage(deals: Deal[], stage: DealStage): Deal[] {
  return deals.filter((deal) => deal.stage === stage).sort(byBoardOrderThenId);
}

function rebaseLocally(
  deals: Deal[],
  id: string,
  stage: DealStage,
  index: number,
): Deal[] {
  const deal = deals.find((row) => row.id === id);
  if (!deal) {
    return deals;
  }
  const stageChanged = deal.stage !== stage;
  const moved: Deal = {
    ...deal,
    stage,
    probability: stageChanged ? STAGE_PROBABILITY[stage] : deal.probability,
  };
  const rest = deals.filter((row) => row.id !== id);
  const column = dealsInStage(rest, stage);
  const insertAt = Math.max(0, Math.min(index, column.length));
  column.splice(insertAt, 0, moved);
  const reordered = column.map((row, boardOrder) => ({ ...row, boardOrder }));
  const columnIds = new Set(reordered.map((row) => row.id));
  return [...rest.filter((row) => !columnIds.has(row.id)), ...reordered];
}

export function PipelineBoard({ deals: initialDeals }: { deals: Deal[] }) {
  const router = useRouter();
  const [deals, setDeals] = useState(initialDeals);

  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) {
      return;
    }
    const stage = result.destination.droppableId as DealStage;
    const index = result.destination.index;
    setDeals((current) => rebaseLocally(current, result.draggableId, stage, index));
    await moveDealAction(result.draggableId, stage, index);
    router.refresh();
  }

  const openValue = sumValue(deals);
  const openExpected = sumExpected(deals);

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerStat}>
          <span className={styles.headerLabel}>Open pipeline</span>
          <span className={styles.headerValue}>{formatMoney(openValue)}</span>
        </div>
        <div className={styles.headerStat}>
          <span className={styles.headerLabel}>Expected</span>
          <span className={styles.headerValue}>{formatMoney(openExpected)}</span>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className={styles.board}>
          {DEAL_STAGES.map((stage) => {
            const columnDeals = dealsInStage(deals, stage);
            const totals = columnTotals(deals, stage);
            return (
              <section
                key={stage}
                className={`${styles.column} ${STAGE_CLASS[stage]}`}
              >
                <header className={styles.columnHeader}>
                  <h2 className={styles.columnName}>{stage}</h2>
                  <p className={styles.columnTotals}>
                    {formatMoney(totals.sumValue)} ·{" "}
                    {formatMoney(totals.sumExpected)} expected
                  </p>
                </header>
                <Droppable droppableId={stage}>
                  {(provided) => (
                    <div
                      className={styles.list}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {columnDeals.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(dragProvided) => (
                            <article
                              className={styles.card}
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <Link
                                className={styles.cardName}
                                href={`/crm/deals/${deal.id}`}
                              >
                                {deal.name}
                              </Link>
                              <p className={styles.cardMeta}>
                                {formatMoney(deal.value)} ·{" "}
                                {formatMoney(expectedValue(deal))} expected ·{" "}
                                {deal.probability}%
                              </p>
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
    </>
  );
}
