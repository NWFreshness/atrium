import { describe, expect, it } from "vitest";
import { assertMoney, assertPercent } from "./numbers";
import { InputError, toResult } from "./result";
import { assertText } from "./text";

describe("toResult", () => {
  it("wraps a value", async () => {
    await expect(toResult(async () => ({ id: "a" }))).resolves.toEqual({
      ok: true,
      value: { id: "a" },
    });
  });

  it("keeps a falsy value a success: only null means the row was not there", async () => {
    await expect(toResult(async () => false)).resolves.toEqual({
      ok: true,
      value: false,
    });
    await expect(toResult(async () => null)).resolves.toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("reports rejected input as invalid, with the field when one is known", async () => {
    await expect(
      toResult(async () => {
        throw new InputError("stage");
      }),
    ).resolves.toEqual({ ok: false, code: "invalid", field: "stage" });
    await expect(
      toResult(async () => {
        throw new InputError();
      }),
    ).resolves.toEqual({ ok: false, code: "invalid" });
  });

  it("lets a caller name its own refusal and rethrows everything else", async () => {
    class Taken extends Error {}
    const known = (error: unknown) =>
      error instanceof Taken
        ? ({ ok: false, code: "taken" } as const)
        : undefined;

    await expect(
      toResult(async () => {
        throw new Taken();
      }, known),
    ).resolves.toEqual({ ok: false, code: "taken" });
    await expect(
      toResult(async () => {
        throw new Error("database is down");
      }, known),
    ).rejects.toThrow("database is down");
  });
});

describe("the input asserts reject with InputError", () => {
  it.each([
    ["text too long", () => assertText("abc", 2)],
    ["invalid text", () => assertText(5, 2)],
    ["invalid money", () => assertMoney(-1)],
    ["invalid percent", () => assertPercent(1.5)],
  ])("%s", (message, attempt) => {
    expect(attempt).toThrow(InputError);
    expect(attempt).toThrow(message);
  });
});
