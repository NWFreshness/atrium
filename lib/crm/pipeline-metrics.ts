import { expectedValue, type DealStage } from "./constants";

export type PipelineDeal = {
  stage: DealStage;
  value: number;
  probability: number;
};

export function isOpen(deal: PipelineDeal): boolean {
  return deal.stage !== "Won" && deal.stage !== "Lost";
}

export function sumValue(deals: PipelineDeal[]): number {
  return deals.filter(isOpen).reduce((total, deal) => total + deal.value, 0);
}

export function sumExpected(deals: PipelineDeal[]): number {
  return deals
    .filter(isOpen)
    .reduce((total, deal) => total + expectedValue(deal), 0);
}

export function columnTotals(
  deals: PipelineDeal[],
  stage: DealStage,
): { sumValue: number; sumExpected: number } {
  const column = deals.filter((deal) => deal.stage === stage);
  return {
    sumValue: column.reduce((total, deal) => total + deal.value, 0),
    sumExpected: column.reduce((total, deal) => total + expectedValue(deal), 0),
  };
}
