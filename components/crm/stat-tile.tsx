import styles from "./dashboard.module.css";

export type StatTileTone = "count" | "open" | "forecast" | "won" | "late";

// Tone colors: purple=count, blue=open, amber=forecast, green=won, red=late.
const TONE_CLASS: Record<StatTileTone, string> = {
  count: styles.tileCount,
  open: styles.tileOpen,
  forecast: styles.tileForecast,
  won: styles.tileWon,
  late: styles.tileLate,
};

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: StatTileTone;
}) {
  return (
    <div className={`${styles.tile} ${TONE_CLASS[tone]}`}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {sub ? <span className={styles.tileSub}>{sub}</span> : null}
    </div>
  );
}
