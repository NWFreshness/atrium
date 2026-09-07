"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { initTheme, toggleTheme } from "@/lib/theme";
import {
  ResetDemoButton,
  type ResetDemoState,
} from "./reset-demo-button";
import styles from "./atrium-nav.module.css";

const APPS = [
  { href: "/", label: "Home", glyph: "⌂" },
  { href: "/crm", label: "CRM", glyph: "◈" },
  { href: "/space", label: "Space", glyph: "▣" },
  { href: "/rolodex", label: "Rolodex", glyph: "◉" },
  { href: "/groove", label: "Groove", glyph: "♪" },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function browserDeps() {
  return {
    storage: window.localStorage,
    document,
    matchMedia: (query: string) => window.matchMedia(query),
  };
}

export function AtriumNav({
  email,
  role,
  logout,
  resetDemo,
}: {
  email?: string | null;
  role?: string | null;
  logout: () => Promise<void>;
  resetDemo: (
    prevState: ResetDemoState,
    formData: FormData,
  ) => Promise<ResetDemoState>;
}) {
  const pathname = usePathname();

  useLayoutEffect(() => {
    initTheme(browserDeps());
  }, []);

  return (
    <nav className={styles["atrium-nav-strip"]} aria-label="Atrium">
      <ul className={styles["atrium-nav-list"]}>
        {APPS.map((app) => {
          const current = isCurrent(pathname, app.href);
          return (
            <li key={app.href}>
              <Link
                href={app.href}
                className={
                  current
                    ? `${styles["atrium-nav-link"]} ${styles["atrium-nav-link-current"]}`
                    : styles["atrium-nav-link"]
                }
                aria-current={current ? "page" : undefined}
              >
                <span className={styles["atrium-nav-glyph"]} aria-hidden="true">
                  {app.glyph}
                </span>
                {app.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles["atrium-nav-end"]}>
        <button
          type="button"
          className={styles["atrium-nav-theme"]}
          onClick={() => {
            toggleTheme(browserDeps());
          }}
        >
          Theme
        </button>
        {email ? (
          <span className={styles["atrium-nav-identity"]}>{email}</span>
        ) : role ? (
          <span className={styles["atrium-nav-identity"]}>{role}</span>
        ) : null}
        {role === "demo" ? <ResetDemoButton action={resetDemo} /> : null}
        <form action={logout}>
          <button type="submit" className={styles["atrium-nav-logout"]}>
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}
