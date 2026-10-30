"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSection } from "@/lib/nav";

export type SubnavSection = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

/** The shared section row under the app strip. The first section is the app root. */
export function AtriumSubnav({
  label,
  sections,
  className,
  listClassName,
}: {
  label: string;
  sections: readonly SubnavSection[];
  className: string;
  listClassName: string;
}) {
  const pathname = usePathname();
  const root = sections[0].href;

  return (
    <nav className={`atrium-subnav ${className}`} aria-label={label}>
      <ul className={listClassName}>
        {sections.map((section) => {
          const current = isSection(pathname, root, section.href);
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
