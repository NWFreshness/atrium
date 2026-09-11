"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { initTheme, toggleTheme } from "@/lib/theme";
import {
  ResetDemoButton,
  type ResetDemoState,
} from "./reset-demo-button";
import {
  CrmIcon,
  GrooveIcon,
  HomeIcon,
  LogoutIcon,
  RolodexIcon,
  SpaceIcon,
  ThemeIcon,
} from "./atrium-icons";
import styles from "./atrium-nav.module.css";

const APPS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/crm", label: "CRM", Icon: CrmIcon },
  { href: "/space", label: "Space", Icon: SpaceIcon },
  { href: "/rolodex", label: "Rolodex", Icon: RolodexIcon },
  { href: "/groove", label: "Groove", Icon: GrooveIcon },
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

function initialOf(email: string | null | undefined) {
  if (!email) {
    return "";
  }
  return email.trim().charAt(0).toUpperCase();
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
      <div className={styles["atrium-nav-left"]}>
        <Link href="/" className={styles["atrium-nav-brand"]}>
          <span className={styles["atrium-nav-brand-mark"]} aria-hidden="true" />
          Atrium
        </Link>
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
                  <app.Icon className={styles["atrium-nav-glyph"]} />
                  {app.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className={styles["atrium-nav-end"]}>
        {email ? (
          <Link href="/settings" className={styles["atrium-nav-identity"]}>
            <span className={styles["atrium-nav-avatar"]} aria-hidden="true">
              {initialOf(email)}
            </span>
            <span className={styles["atrium-nav-email"]}>{email}</span>
          </Link>
        ) : role ? (
          <span className={styles["atrium-nav-identity"]}>{role}</span>
        ) : null}
        <button
          type="button"
          className={`atrium-btn ${styles["atrium-nav-theme"]}`}
          onClick={() => {
            toggleTheme(browserDeps());
          }}
          aria-label="Toggle theme"
        >
          <ThemeIcon />
          <span className={styles["atrium-nav-btn-label"]}>Theme</span>
        </button>
        {role === "demo" ? <ResetDemoButton action={resetDemo} /> : null}
        <form action={logout}>
          <button type="submit" className={`atrium-btn ${styles["atrium-nav-logout"]}`}>
            <LogoutIcon />
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}