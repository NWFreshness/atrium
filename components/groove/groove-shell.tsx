import { UNIT_META } from "@/lib/groove/params";
import styles from "./groove-shell.module.css";

const UNITS = (["drums", "bass", "pads", "lead"] as const).map((id) => ({
  id,
  ...UNIT_META[id],
}));

export function GrooveShell() {
  return (
    <div className={styles["groove-shell"]}>
      <div className={styles["groove-transport"]} aria-label="Groove transport">
        <span className={styles["groove-brand"]}>GROOVEBOX GX-4</span>
        <button
          type="button"
          className={styles["groove-play"]}
          aria-label="Transport"
          disabled
        >
          PLAY
        </button>
        <span className={styles["groove-patch"]} aria-label="Active patch">
          A · NEON RIVIERA
        </span>
        <span className={styles["groove-meta"]} aria-label="Tempo">
          112 BPM
        </span>
      </div>

      <main className={styles["groove-deck"]}>
        {UNITS.map((unit) => (
          <section
            key={unit.id}
            aria-label={unit.name}
            className={styles["groove-unit"]}
          >
            <header className={styles["groove-unit-header"]}>
              <span className={styles["groove-unit-name"]}>{unit.name}</span>
              <span className={styles["groove-unit-model"]}>{unit.model}</span>
            </header>
            <div className={styles["groove-unit-body"]}>
              <p className={styles["groove-unit-copy"]}>
                Sequencer lands in 4.3.
              </p>
            </div>
          </section>
        ))}
      </main>

      <div className={styles["groove-master"]} aria-label="Groove master strip">
        <span className={styles["groove-master-title"]}>MASTER · FILTER</span>
        <span className={styles["groove-master-copy"]}>
          Master panel lands in 4.6.
        </span>
      </div>
    </div>
  );
}
