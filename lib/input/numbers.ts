export const MAX_MONEY = 1e12;

export function assertMoney(
  value: unknown,
  opts: { min?: number; max?: number } = {},
): number {
  const min = opts.min ?? 0;
  const max = opts.max ?? MAX_MONEY;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("invalid money");
  }
  if (value < min || value > max) {
    throw new Error("invalid money");
  }
  return value;
}

export function assertPercent(
  value: unknown,
  opts: { min?: number; max?: number } = {},
): number {
  const min = opts.min ?? 0;
  const max = opts.max ?? 100;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("invalid percent");
  }
  if (value < min || value > max) {
    throw new Error("invalid percent");
  }
  return value;
}
