import Link from "next/link";

const apps = [
  { href: "/crm", label: "CRM" },
  { href: "/space", label: "Space" },
  { href: "/rolodex", label: "Rolodex" },
  { href: "/groove", label: "Groove" },
] as const;

export default function Home() {
  return (
    <main>
      <h1>Atrium</h1>
      <p>Four personal apps, one login.</p>
      <ul className="launcher-cards">
        {apps.map((app) => (
          <li key={app.href}>
            <Link href={app.href}>{app.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
