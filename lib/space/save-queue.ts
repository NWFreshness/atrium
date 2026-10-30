/** Debounced, per-key saves: an editor's unsaved edits and the timers that will send them. */
export type SaveQueue<T> = {
  /** Remember the latest value for `id` and (re)start its countdown. */
  schedule(id: string, value: T): void;
  /** Drop `id` from the unsaved set, so a flush skips it. Its countdown is left alone. */
  forget(id: string): void;
  /** Cancel every countdown and save every unsaved value now. */
  flush(): void;
};

export function createSaveQueue<T>(
  save: (id: string, value: T) => void,
  delayMs: number,
): SaveQueue<T> {
  const pending = new Map<string, T>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  return {
    schedule(id, value) {
      pending.set(id, value);
      clearTimeout(timers.get(id));
      timers.set(
        id,
        setTimeout(() => {
          pending.delete(id);
          timers.delete(id);
          save(id, value);
        }, delayMs),
      );
    },
    forget(id) {
      pending.delete(id);
    },
    flush() {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      for (const [id, value] of pending) {
        save(id, value);
      }
      pending.clear();
    },
  };
}
