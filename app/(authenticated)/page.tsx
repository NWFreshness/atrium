import type { CSSProperties } from "react";
import Link from "next/link";
import {
  CrmIcon,
  GrooveIcon,
  RolodexIcon,
  SpaceIcon,
} from "@/components/atrium-icons";

const apps = [
  {
    href: "/crm",
    label: "CRM",
    blurb:
      "Organizations, contacts, deals, and a drag-and-drop pipeline for the work you're chasing.",
    accent: "var(--clay-ink)",
    Icon: CrmIcon,
  },
  {
    href: "/space",
    label: "Space",
    blurb:
      "Pages, blocks, and databases — a quiet place to keep everything you read and decide.",
    accent: "var(--moss)",
    Icon: SpaceIcon,
  },
  {
    href: "/rolodex",
    label: "Rolodex",
    blurb:
      "People, circles, and cadences — so no one you care about slips away.",
    accent: "var(--slate)",
    Icon: RolodexIcon,
  },
  {
    href: "/groove",
    label: "Groove",
    blurb:
      "A four-unit groovebox that lives in your browser. Web Audio, no database, all play.",
    accent: "var(--brass)",
    Icon: GrooveIcon,
  },
] as const;

export default function Home() {
  return (
    <main className="atrium-launcher">
      <h1>Atrium</h1>
      <p className="atrium-sub">Four personal apps, one login.</p>
      <div className="atrium-graph">
        {apps.map((app, i) => (
          <Link
            key={app.href}
            href={app.href}
            className="atrium-appcard reveal"
            style={
              {
                "--i": i + 1,
                "--app-accent": app.accent,
              } as CSSProperties
            }
          >
            <span className="atrium-appcard-icon">
              <app.Icon />
            </span>
            <h3>{app.label}</h3>
            <p>{app.blurb}</p>
            <span className="atrium-appcard-open">Open →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
