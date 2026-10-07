"use client";

/*
 * 13.2 — the shared theme toggle. Mounted in the top-nav chrome
 * (components/atrium-nav.tsx) so it is reached from all four apps.
 *
 * First visit is always light (spec D5 — the OS prefers-color-scheme is not
 * auto-followed); a stored choice wins afterwards and persists client-side in
 * localStorage. When storage is unavailable the toggle still flips for the
 * session and never throws.
 */
import { useEffect, useState } from "react";
import { initTheme, toggleTheme, type Theme } from "@/lib/theme";
import { ThemeIcon } from "./atrium-icons";
import styles from "./atrium-nav.module.css";

function browserDeps() {
  return {
    storage: window.localStorage,
    document,
  };
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      initTheme(browserDeps());
      const applied = document.documentElement.getAttribute("data-theme");
      if (applied === "light" || applied === "dark") {
        setTheme(applied);
      }
    } catch {
      /* Storage/document unavailable: stay on the light default. */
    }
  }, []);

  return (
    <button
      type="button"
      className="atrium-btn"
      onClick={() => {
        try {
          setTheme(toggleTheme(browserDeps()));
        } catch {
          /* Session-only flip when persistence throws. */
          setTheme((current) => (current === "dark" ? "light" : "dark"));
        }
      }}
      aria-label="Toggle theme"
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      <ThemeIcon />
      <span className={styles["atrium-nav-btn-label"]}>Theme</span>
    </button>
  );
}
