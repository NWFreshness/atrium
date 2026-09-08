"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isCrmSection } from "@/lib/crm/nav";
import styles from "./crm-subnav.module.css";

const SECTIONS = [
  { href: "/crm", label: "Dashboard", glyph: "▦" },
  { href: "/crm/organizations", label: "Organizations", glyph: "⬡" },
  { href: "/crm/contacts", label: "Contacts", glyph: "●" },
  { href: "/crm/deals", label: "Deals", glyph: "$" },
  { href: "/crm/pipeline", label: "Pipeline", glyph: "≡" },
] as const;

export function CrmSubnav() {
  const pathname = usePathname();

  return (
    <nav className={styles["crm-subnav"]} aria-label="CRM">
      <ul className={styles["crm-subnav-list"]}>
        {SECTIONS.map((section) => {
          const current = isCrmSection(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                className={
                  current
                    ? `${styles["crm-subnav-link"]} ${styles["crm-subnav-link-current"]}`
                    : styles["crm-subnav-link"]
                }
                aria-current={current ? "page" : undefined}
              >
                <span className={styles["crm-subnav-glyph"]} aria-hidden="true">
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
