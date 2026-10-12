import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveQueue } from "./save-queue";

describe("createSaveQueue", () => {
  let saved: [string, string][];
  const queue = () =>
    createSaveQueue<string>((id, value) => saved.push([id, value]), 300);

  beforeEach(() => {
    vi.useFakeTimers();
    saved = [];
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves once, 300 ms after the last edit, with the latest value", () => {
    const q = queue();
    q.schedule("a", "h");
    vi.advanceTimersByTime(200);
    q.schedule("a", "he");
    vi.advanceTimersByTime(299);
    expect(saved).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(saved).toEqual([["a", "he"]]);
    vi.advanceTimersByTime(1000);
    expect(saved).toEqual([["a", "he"]]);
  });

  it("debounces each block on its own clock", () => {
    const q = queue();
    q.schedule("a", "1");
    vi.advanceTimersByTime(200);
    q.schedule("b", "2");
    vi.advanceTimersByTime(100);
    expect(saved).toEqual([["a", "1"]]);
    vi.advanceTimersByTime(200);
    expect(saved).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  it("flushes every unsaved edit at once and cancels their timers", () => {
    const q = queue();
    q.schedule("a", "1");
    q.schedule("b", "2");
    q.schedule("a", "3");
    q.flush();
    expect(saved).toEqual([
      ["a", "3"],
      ["b", "2"],
    ]);
    vi.advanceTimersByTime(1000);
    expect(saved).toHaveLength(2);
  });

  it("has nothing left to flush once an edit has been saved", () => {
    const q = queue();
    q.schedule("a", "1");
    vi.advanceTimersByTime(300);
    q.flush();
    expect(saved).toEqual([["a", "1"]]);
  });

  it("leaves a forgotten edit out of a flush", () => {
    const q = queue();
    q.schedule("a", "1");
    q.schedule("b", "2");
    q.forget("a");
    q.flush();
    expect(saved).toEqual([["b", "2"]]);
  });
});
