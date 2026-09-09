export const CIRCLES = ["inner", "close", "wider", "distant"] as const;

export type Circle = (typeof CIRCLES)[number];

export const INTERACTION_TYPES = [
  "call",
  "message",
  "email",
  "met",
  "other",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const DATE_TYPES = [
  "birthday",
  "anniversary",
  "work_anniversary",
  "child_birthday",
  "other",
] as const;

export type ImportantDateType = (typeof DATE_TYPES)[number];

export const GIFT_KINDS = ["idea", "given", "received"] as const;

export type GiftKind = (typeof GIFT_KINDS)[number];

export const CHECK_IN_STATUSES = [
  "in_touch",
  "due_soon",
  "overdue",
  "snoozed",
  "off",
] as const;

export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];

export const CONNECTION_KINDS = [
  "partner",
  "parent_child",
  "sibling",
  "colleague",
  "other",
] as const;

export type ConnectionKind = (typeof CONNECTION_KINDS)[number];

export type CircleMeta = {
  key: Circle;
  label: string;
  cadenceDays: number;
  cadenceDescription: string;
  blurb: string;
};

export const CIRCLE_META: Record<Circle, CircleMeta> = {
  inner: {
    key: "inner",
    label: "Inner",
    cadenceDays: 30,
    cadenceDescription: "Monthly",
    blurb: "Your closest people — aim to be in touch every month.",
  },
  close: {
    key: "close",
    label: "Close",
    cadenceDays: 91,
    cadenceDescription: "Quarterly",
    blurb: "Good friends and close family — every three months or so.",
  },
  wider: {
    key: "wider",
    label: "Wider",
    cadenceDays: 182,
    cadenceDescription: "Every six months",
    blurb: "Friends you want to keep — twice a year.",
  },
  distant: {
    key: "distant",
    label: "Distant",
    cadenceDays: 365,
    cadenceDescription: "Yearly",
    blurb: "Acquaintances and old friends — once a year is enough.",
  },
};

export const DUE_SOON_WINDOW_DAYS = 7;
