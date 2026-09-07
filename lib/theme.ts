export const THEME_STORAGE_KEY = "atrium.theme";

export type Theme = "light" | "dark";

export type ThemeDeps = {
  storage?: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  document?: {
    documentElement: {
      setAttribute: (name: string, value: string) => void;
      getAttribute?: (name: string) => string | null;
    };
  };
  matchMedia?: (query: string) => { matches: boolean };
};

function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function readStoredTheme(deps: ThemeDeps): Theme | null {
  try {
    const stored = deps.storage?.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function readOsTheme(deps: ThemeDeps): Theme | null {
  try {
    const media = deps.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) {
      return null;
    }
    return media.matches ? "dark" : "light";
  } catch {
    return null;
  }
}

function readAppliedTheme(deps: ThemeDeps): Theme | null {
  try {
    const applied = deps.document?.documentElement.getAttribute?.("data-theme");
    return isTheme(applied) ? applied : null;
  } catch {
    return null;
  }
}

function resolvedTheme(deps: ThemeDeps): Theme {
  return readStoredTheme(deps) ?? readOsTheme(deps) ?? "light";
}

function currentTheme(deps: ThemeDeps): Theme {
  return readAppliedTheme(deps) ?? resolvedTheme(deps);
}

function applyTheme(theme: Theme, deps: ThemeDeps): void {
  deps.document?.documentElement.setAttribute("data-theme", theme);
}

export function initTheme(deps: ThemeDeps = {}): void {
  applyTheme(resolvedTheme(deps), deps);
}

export function toggleTheme(deps: ThemeDeps = {}): Theme {
  const next: Theme = currentTheme(deps) === "dark" ? "light" : "dark";
  applyTheme(next, deps);
  try {
    deps.storage?.setItem(THEME_STORAGE_KEY, next);
  } catch {}
  return next;
}
