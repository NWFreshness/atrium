export const DEAL_STAGES = [
  "New",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  New: 10,
  Qualified: 25,
  Proposal: 50,
  Negotiation: 75,
  Won: 100,
  Lost: 0,
};

export const CONTACT_STATUSES = ["lead", "qualified", "customer"] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const ACTIVITY_TYPES = ["note", "call", "email"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function expectedValue({
  value,
  probability,
}: {
  value: number;
  probability: number;
}): number {
  return (value * probability) / 100;
}
