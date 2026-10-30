export const THEME_STORAGE_KEY = "atrium.theme";

/*
 * Coral: first visit is always light, the paper the system is designed on;
 * the felt-board dark is the toggle. A stored choice wins; the OS
 * prefers-color-scheme is still deliberately NOT auto-followed (predictable
 * default). Runs in <head> before first paint (see app/layout.tsx), so the
 * first paint is already light.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t="light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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

function readAppliedTheme(deps: ThemeDeps): Theme | null {
  try {
    const applied = deps.document?.documentElement.getAttribute?.("data-theme");
    return isTheme(applied) ? applied : null;
  } catch {
    return null;
  }
}

/*
 * Stored choice wins, otherwise light (Coral is a paper theme). The OS
 * preference is not consulted, so first visit is always light regardless of
 * the OS setting. Storage throwing (private mode) also lands on light, never
 * on an exception.
 */
function resolvedTheme(deps: ThemeDeps): Theme {
  return readStoredTheme(deps) ?? "light";
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
