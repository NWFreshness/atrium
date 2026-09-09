"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isRolodexSection } from "@/lib/rolodex/nav";
import styles from "./rolodex-subnav.module.css";

const SECTIONS = [
  { href: "/rolodex", label: "Today", glyph: "☀" },
  { href: "/rolodex/people", label: "People", glyph: "●" },
  { href: "/rolodex/circles", label: "Circles", glyph: "◎" },
  { href: "/rolodex/calendar", label: "Calendar", glyph: "▦" },
  { href: "/rolodex/timeline", label: "Timeline", glyph: "≡" },
] as const;

export function RolodexSubnav() {
  const pathname = usePathname();

  return (
    <nav className={styles["rolodex-subnav"]} aria-label="Rolodex">
      <ul className={styles["rolodex-subnav-list"]}>
        {SECTIONS.map((section) => {
          const current = isRolodexSection(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={
                  current
                    ? `${styles["rolodex-subnav-link"]} ${styles["rolodex-subnav-link-current"]}`
                    : styles["rolodex-subnav-link"]
                }
                aria-current={current ? "page" : undefined}
              >
                <span
                  className={styles["rolodex-subnav-glyph"]}
                  aria-hidden="true"
                >
                  {section.glyph}
                </span>
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
