import { describe, expect, it } from "vitest";
import { initTheme, THEME_STORAGE_KEY, toggleTheme } from "./theme";

function createStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
  };
}

function createDocument() {
  const attrs: Record<string, string> = {};
  return {
    documentElement: {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
    },
  };
}

describe("initTheme", () => {
  it("follows prefers-color-scheme on first visit when nothing is stored", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage(),
      document,
      matchMedia: () => ({ matches: true }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("follows a light OS preference on first visit when nothing is stored", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage(),
      document,
      matchMedia: () => ({ matches: false }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("uses a stored light or dark theme instead of the OS preference", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage({ [THEME_STORAGE_KEY]: "light" }),
      document,
      matchMedia: () => ({ matches: true }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to the OS preference when the stored value is invalid", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage({ [THEME_STORAGE_KEY]: "system" }),
      document,
      matchMedia: () => ({ matches: true }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("toggleTheme", () => {
  it("flips light to dark and persists the result", () => {
    const storage = createStorage({ [THEME_STORAGE_KEY]: "light" });
    const document = createDocument();
    const deps = {
      storage,
      document,
      matchMedia: () => ({ matches: true }),
    };

    initTheme(deps);
    toggleTheme(deps);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("flips dark to light and persists the result", () => {
    const storage = createStorage({ [THEME_STORAGE_KEY]: "dark" });
    const document = createDocument();
    const deps = {
      storage,
      document,
      matchMedia: () => ({ matches: false }),
    };

    initTheme(deps);
    toggleTheme(deps);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("flips the OS default when nothing is stored", () => {
    const storage = createStorage();
    const document = createDocument();
    const deps = {
      storage,
      document,
      matchMedia: () => ({ matches: true }),
    };

    initTheme(deps);
    toggleTheme(deps);

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
