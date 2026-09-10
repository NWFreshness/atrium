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
    glow: "rgba(205, 114, 88, 0.12)",
    Icon: CrmIcon,
  },
  {
    href: "/space",
    label: "Space",
    blurb:
      "Pages, blocks, and databases — a quiet place to keep everything you read and decide.",
    glow: "rgba(139, 159, 194, 0.12)",
    Icon: SpaceIcon,
  },
  {
    href: "/rolodex",
    label: "Rolodex",
    blurb:
      "People, circles, and cadences — so no one you care about slips away.",
    glow: "rgba(143, 174, 131, 0.12)",
    Icon: RolodexIcon,
  },
  {
    href: "/groove",
    label: "Groove",
    blurb:
      "A four-unit groovebox that lives in your browser. Web Audio, no database, all play.",
    glow: "rgba(223, 163, 60, 0.16)",
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
                "--app-glow": app.glow,
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