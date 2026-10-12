/** Rejected caller input. `field` names the offending key when one is known. */
export class InputError extends Error {
  constructor(
    readonly field?: string,
    message = "invalid input",
  ) {
    super(message);
  }
}

/** Untrusted enum value: must be one of the listed literals. */
export function assertOneOf<T extends string>(
  values: readonly T[],
  value: unknown,
  field: string,
  message?: string,
): T {
  if (
    typeof value !== "string" ||
    !(values as readonly string[]).includes(value)
  ) {
    throw new InputError(field, message);
  }
  return value as T;
}

/**
 * A referenced row must exist in the caller's tenant. `find` is tenant-scoped,
 * so another tenant's id is indistinguishable from a missing one.
 */
export async function assertRef(
  field: string,
  id: string | null | undefined,
  find: (id: string) => Promise<unknown>,
  message?: string,
): Promise<void> {
  if (id && !(await find(id))) {
    throw new InputError(field, message);
  }
}

/**
 * What every mutating server action answers with. A failure is data the form
 * can show, not an exception and not a `null` that could mean two things.
 */
export type ActionResult<T, C extends string = never> =
  | { ok: true; value: T }
  | { ok: false; code: "invalid" | "not_found" | C; field?: string };

/**
 * Runs one mutation and maps its outcome, in the one place every action
 * wrapper shares: rejected input is `invalid`, a missing (or another tenant's)
 * row is `not_found`. `known` turns a domain refusal into its own failure;
 * anything else is a real fault and keeps propagating.
 */
export function toResult<T>(
  work: () => Promise<T | null>,
): Promise<ActionResult<T>>;
export function toResult<T, F extends { ok: false }>(
  work: () => Promise<T | null>,
  known: (error: unknown) => F | undefined,
): Promise<ActionResult<T> | F>;
export async function toResult<T, F extends { ok: false }>(
  work: () => Promise<T | null>,
  known?: (error: unknown) => F | undefined,
): Promise<ActionResult<T> | F> {
  try {
    const value = await work();
    return value === null
      ? { ok: false, code: "not_found" }
      : { ok: true, value };
  } catch (error) {
    if (error instanceof InputError) {
      return error.field === undefined
        ? { ok: false, code: "invalid" }
        : { ok: false, code: "invalid", field: error.field };
    }
    const failure = known?.(error);
    if (failure) {
      return failure;
    }
    throw error;
  }
}
