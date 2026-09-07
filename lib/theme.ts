export const THEME_STORAGE_KEY = "atrium.theme";

export type Theme = "light" | "dark";

export type ThemeDeps = {
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  document?: {
    documentElement: { setAttribute: (name: string, value: string) => void };
  };
  matchMedia?: (query: string) => { matches: boolean };
};

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function currentTheme(deps: ThemeDeps): Theme {
  const stored = deps.storage?.getItem(THEME_STORAGE_KEY);
  if (isTheme(stored)) {
    return stored;
  }
  return deps.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme, deps: ThemeDeps) {
  deps.document?.documentElement.setAttribute("data-theme", theme);
}

export function initTheme(deps: ThemeDeps = {}) {
  applyTheme(currentTheme(deps), deps);
}

export function toggleTheme(deps: ThemeDeps = {}) {
  const next: Theme = currentTheme(deps) === "dark" ? "light" : "dark";
  applyTheme(next, deps);
  deps.storage?.setItem(THEME_STORAGE_KEY, next);
  return next;
}
