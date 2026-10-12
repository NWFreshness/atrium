import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { getDashboardAction as getCrmDashboard } from "@/lib/crm/dashboard-actions";
import { launcherReadouts, type UnitStatus } from "@/lib/launcher";
import { getDashboardAction as getRolodexDashboard } from "@/lib/rolodex/dashboard-actions";
import { listPagesAction } from "@/lib/space/page-actions";

const apps = [
  {
    key: "crm",
    unit: "U1 · CR",
    href: "/crm",
    label: "CRM",
    blurb: "Organizations, contacts, deals, and a drag-and-drop pipeline.",
  },
  {
    key: "space",
    unit: "U2 · SP",
    href: "/space",
    label: "Space",
    blurb: "Pages, blocks, and databases for what you read and decide.",
  },
  {
    key: "rolodex",
    unit: "U3 · RX",
    href: "/rolodex",
    label: "Rolodex",
    blurb: "People, circles, and cadences, so no one slips away.",
  },
  {
    key: "groove",
    unit: "U4 · GR",
    href: "/groove",
    label: "Groove",
    blurb: "A four-unit groovebox in the browser. Web Audio, no database.",
  },
] as const;

const LED_CLASS: Record<UnitStatus, string> = {
  ok: "atrium-led",
  warn: "atrium-led atrium-led-warn",
  bad: "atrium-led atrium-led-bad",
};

const LED_WORD: Record<UnitStatus, string> = {
  ok: "All clear",
  warn: "Items due",
  bad: "Items overdue",
};

type Readouts = ReturnType<typeof launcherReadouts>;

/**
 * The launcher still opens when a summary cannot be read: the units render
 * with dark LEDs and no figures instead of the whole page failing.
 */
async function loadReadouts(): Promise<Readouts | null> {
  try {
    const [crm, rolodex, pages] = await Promise.all([
      getCrmDashboard(),
      getRolodexDashboard(),
      listPagesAction(),
    ]);
    // shortcut: reuses the full per-app dashboards for a handful of counts;
    // switch to count queries if the readouts take too long to light up.
    return launcherReadouts({ crm, rolodex, pages });
  } catch {
    return null;
  }
}

/** `enter` staggers the units in; only the first paint does, so the swap to
 * live figures does not replay the animation. */
function Rack({
  readouts,
  enter = false,
}: {
  readouts: Readouts | null;
  enter?: boolean;
}) {
  return (
    <div className="atrium-graph">
      {apps.map((app, i) => {
        const unit = app.key === "groove" ? null : readouts?.[app.key];
        return (
          <Link
            key={app.href}
            href={app.href}
            className={enter ? "atrium-appcard reveal" : "atrium-appcard"}
            style={{ "--i": i + 1 } as CSSProperties}
          >
            <span className="atrium-appcard-id">
              {app.unit}
              {unit ? (
                <span
                  className={LED_CLASS[unit.status]}
                  role="img"
                  aria-label={LED_WORD[unit.status]}
                />
              ) : (
                <span
                  className="atrium-led atrium-led-off"
                  aria-hidden="true"
                />
              )}
            </span>
            <div>
              <h3>{app.label}</h3>
              <p>{app.blurb}</p>
            </div>
            {unit ? (
              <dl className="atrium-appcard-readouts">
                {unit.readouts.map((readout) => (
                  <div key={readout.label}>
                    <dt>{readout.label}</dt>
                    <dd data-tone={readout.tone}>{readout.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div />
            )}
            <span className="atrium-appcard-open">Open</span>
          </Link>
        );
      })}
    </div>
  );
}

async function LiveRack() {
  return <Rack readouts={await loadReadouts()} />;
}

/**
 * The rack paints at once with dark LEDs; the figures stream in behind a
 * Suspense boundary, so signing in never waits on three dashboards.
 */
export default function Home() {
  return (
    <main className="atrium-launcher">
      <p className="atrium-label">Rack · four units</p>
      <h1>Atrium</h1>
      <p className="atrium-sub">Four personal apps, one login.</p>
      <Suspense fallback={<Rack readouts={null} enter />}>
        <LiveRack />
      </Suspense>
    </main>
  );
}
