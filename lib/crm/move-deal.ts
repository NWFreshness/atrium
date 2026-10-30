import { assertOneOf } from "../input/result";
import { DEAL_STAGES, STAGE_PROBABILITY, type DealStage } from "./constants";
import {
  getDeal,
  listDeals,
  reorderDeals,
  type CrmStore,
  type Deal,
} from "./queries";

function byBoardOrderThenId(left: Deal, right: Deal): number {
  if (left.boardOrder !== right.boardOrder) {
    return left.boardOrder - right.boardOrder;
  }
  return left.id.localeCompare(right.id);
}

export async function moveDeal(
  tenantId: string,
  id: string,
  stage: DealStage,
  index?: number,
  repo?: CrmStore,
): Promise<Deal | null> {
  assertOneOf(DEAL_STAGES, stage, "stage");
  const deal = await getDeal(tenantId, id, repo);
  if (!deal) {
    return null;
  }

  const column = (await listDeals(tenantId, repo))
    .filter((row) => row.stage === stage && row.id !== id)
    .sort(byBoardOrderThenId);
  const insertAt =
    index === undefined
      ? column.length
      : Math.max(0, Math.min(index, column.length));

  const stageChanged = deal.stage !== stage;
  if (!stageChanged) {
    const currentIndex = [...column, deal]
      .sort(byBoardOrderThenId)
      .findIndex((row) => row.id === id);
    if (currentIndex === insertAt) {
      return deal;
    }
  }

  const ordered = [...column];
  ordered.splice(insertAt, 0, deal);

  // The whole column goes down as one write, so a failure cannot leave gaps.
  await reorderDeals(
    tenantId,
    ordered.map((row, boardOrder) => ({
      id: row.id,
      stage,
      boardOrder,
      ...(row.id === id && stageChanged
        ? { probability: STAGE_PROBABILITY[stage] }
        : {}),
    })),
    repo,
  );
  return getDeal(tenantId, id, repo);
}
