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

  it("uses a stored dark theme instead of the OS preference", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage({ [THEME_STORAGE_KEY]: "dark" }),
      document,
      matchMedia: () => ({ matches: false }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to the OS preference when storage is omitted", () => {
    const document = createDocument();

    initTheme({
      document,
      matchMedia: () => ({ matches: true }),
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to light when matchMedia is omitted and nothing is stored", () => {
    const document = createDocument();

    initTheme({
      storage: createStorage(),
      document,
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("does not throw when document is omitted", () => {
    expect(() =>
      initTheme({
        storage: createStorage({ [THEME_STORAGE_KEY]: "dark" }),
        matchMedia: () => ({ matches: false }),
      }),
    ).not.toThrow();
  });

  it("falls back to the OS preference when storage getItem throws", () => {
    const document = createDocument();

    expect(() =>
      initTheme({
        storage: {
          getItem() {
            throw new Error("private mode");
          },
          setItem() {},
        },
        document,
        matchMedia: () => ({ matches: true }),
      }),
    ).not.toThrow();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("falls back to light when storage getItem throws and matchMedia is unavailable", () => {
    const document = createDocument();

    expect(() =>
      initTheme({
        storage: {
          getItem() {
            throw new Error("private mode");
          },
          setItem() {},
        },
        document,
      }),
    ).not.toThrow();

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to light when matchMedia throws and nothing is stored", () => {
    const document = createDocument();

    expect(() =>
      initTheme({
        storage: createStorage(),
        document,
        matchMedia: () => {
          throw new Error("private mode");
        },
      }),
    ).not.toThrow();

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
    const next = toggleTheme(deps);

    expect(next).toBe("dark");
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
    const next = toggleTheme(deps);

    expect(next).toBe("light");
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
    const next = toggleTheme(deps);

    expect(next).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("still applies data-theme when storage setItem throws", () => {
    const document = createDocument();
    const deps = {
      storage: {
        getItem() {
          return "light";
        },
        setItem() {
          throw new Error("private mode");
        },
      },
      document,
      matchMedia: () => ({ matches: false }),
    };

    initTheme(deps);
    let next: string | undefined;
    expect(() => {
      next = toggleTheme(deps);
    }).not.toThrow();

    expect(next).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("flips data-theme on each toggle when storage setItem throws", () => {
    const document = createDocument();
    const deps = {
      storage: {
        getItem() {
          return "dark";
        },
        setItem() {
          throw new Error("private mode");
        },
      },
      document,
      matchMedia: () => ({ matches: true }),
    };

    initTheme(deps);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    expect(() => toggleTheme(deps)).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    expect(() => toggleTheme(deps)).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("does not throw when storage is omitted", () => {
    const document = createDocument();
    const deps = {
      document,
      matchMedia: () => ({ matches: true }),
    };

    initTheme(deps);
    let next: string | undefined;
    expect(() => {
      next = toggleTheme(deps);
    }).not.toThrow();

    expect(next).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("does not throw when matchMedia is omitted", () => {
    const storage = createStorage();
    const document = createDocument();
    const deps = { storage, document };

    initTheme(deps);
    let next: string | undefined;
    expect(() => {
      next = toggleTheme(deps);
    }).not.toThrow();

    expect(next).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("does not throw when document is omitted", () => {
    const storage = createStorage({ [THEME_STORAGE_KEY]: "light" });

    expect(() => toggleTheme({ storage })).not.toThrow();
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("does not throw when storage getItem throws", () => {
    const document = createDocument();
    const deps = {
      storage: {
        getItem() {
          throw new Error("private mode");
        },
        setItem() {},
      },
      document,
      matchMedia: () => ({ matches: true }),
    };

    let next: string | undefined;
    expect(() => {
      next = toggleTheme(deps);
    }).not.toThrow();

    expect(next).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("does not throw when matchMedia throws", () => {
    const storage = createStorage();
    const document = createDocument();
    const deps = {
      storage,
      document,
      matchMedia: () => {
        throw new Error("private mode");
      },
    };

    let next: string | undefined;
    expect(() => {
      next = toggleTheme(deps);
    }).not.toThrow();

    expect(next).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
