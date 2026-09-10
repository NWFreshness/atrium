import type { CSSProperties } from "react";
import styles from "./dashboard.module.css";

export type StatTileTone = "count" | "open" | "forecast" | "won" | "late";

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
  index = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: StatTileTone;
  index?: number;
}) {
  return (
    <div
      className={`${styles.tile} ${TONE_CLASS[tone]} reveal`}
      style={{ "--i": index } as CSSProperties}
    >
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {sub ? <span className={styles.tileSub}>{sub}</span> : null}
    </div>
  );
}