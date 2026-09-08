import { STAGE_PROBABILITY, type DealStage } from "./constants";
import {
  getDeal,
  listDeals,
  updateDeal,
  type CrmRepository,
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
  repo?: CrmRepository,
): Promise<Deal | null> {
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

  let moved: Deal | null = null;
  for (let boardOrder = 0; boardOrder < ordered.length; boardOrder += 1) {
    const row = ordered[boardOrder];
    if (row.id === id) {
      moved = await updateDeal(
        tenantId,
        id,
        {
          stage,
          boardOrder,
          ...(stageChanged ? { probability: STAGE_PROBABILITY[stage] } : {}),
        },
        repo,
      );
      continue;
    }
    await updateDeal(tenantId, row.id, { boardOrder }, repo);
  }

  return moved;
}
