"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCrmSection } from "@/lib/crm/nav";
import styles from "./crm-subnav.module.css";

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
    href: "/crm",
    label: "Dashboard",
    icon: icon(
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>,
    ),
  },
  {
    href: "/crm/organizations",
    label: "Organizations",
    icon: icon(
      <>
        <path d="M4 21h16M6 21V8l6-4 6 4v13" />
        <path d="M10 21v-5h4v5" />
      </>,
    ),
  },
  {
    href: "/crm/contacts",
    label: "Contacts",
    icon: icon(
      <>
        <circle cx="9" cy="8.5" r="3" />
        <path d="M3.5 19c1-3 3-4.5 5.5-4.5S13 16 14 19" />
        <circle cx="16.5" cy="10.5" r="2.4" />
        <path d="M15.5 14.6c2.8.2 4.5 1.6 5.3 4.4" />
      </>,
    ),
  },
  {
    href: "/crm/deals",
    label: "Deals",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7.5v9M14.5 9.2c-.5-1-1.4-1.4-2.5-1.4-1.4 0-2.5.8-2.5 2 0 2.5 5 1.5 5 4 0 1.2-1.1 2-2.5 2-1.2 0-2.1-.5-2.6-1.5" />
      </>,
    ),
  },
  {
    href: "/crm/pipeline",
    label: "Pipeline",
    icon: icon(
      <>
        <rect x="3" y="5" width="8" height="14" rx="1.5" />
        <rect x="16" y="5" width="5" height="4" rx="1" />
        <rect x="16" y="10" width="5" height="4" rx="1" />
        <rect x="16" y="15" width="5" height="4" rx="1" />
      </>,
    ),
  },
] as const;

export function CrmSubnav() {
  const pathname = usePathname();

  return (
    <nav className={`atrium-subnav ${styles["crm-subnav"]}`} aria-label="CRM">
      <ul className={styles["crm-subnav-list"]}>
        {SECTIONS.map((section) => {
          const current = isCrmSection(pathname, section.href);
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