"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isRolodexSection } from "@/lib/rolodex/nav";
import styles from "./rolodex-subnav.module.css";

function icon(children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const SECTIONS = [
  {
    href: "/rolodex",
    label: "Today",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.5 5.5 7 7m10 10 1.5 1.5m0-13L17 7M7 17l-1.5 1.5" />
      </>,
    ),
  },
  {
    href: "/rolodex/people",
    label: "People",
    icon: icon(
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c1-3 3-4.5 5.5-4.5S13 16 14 19" />
      </>,
    ),
  },
  {
    href: "/rolodex/circles",
    label: "Circles",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5.5" />
        <circle cx="12" cy="12" r="1.6" />
      </>,
    ),
  },
  {
    href: "/rolodex/calendar",
    label: "Calendar",
    icon: icon(
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2" />
        <path d="M3.5 10h17M8 3v4m8-4v4" />
      </>,
    ),
  },
  {
    href: "/rolodex/timeline",
    label: "Timeline",
    icon: icon(
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </>,
    ),
  },
] as const;

export function RolodexSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className={`atrium-subnav ${styles["rolodex-subnav"]}`}
      aria-label="Rolodex"
    >
      <ul className={styles["rolodex-subnav-list"]}>
        {SECTIONS.map((section) => {
          const current = isRolodexSection(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={
                  current
                    ? "atrium-subtab atrium-subtab-active"
                    : "atrium-subtab"
                }
                aria-current={current ? "page" : undefined}
              >
                {section.icon}
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}