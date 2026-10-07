"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import type {
  FunnelStage,
  MonthlyRevenue,
  TopOrganization,
  WinLoss,
} from "@/lib/crm/dashboard";
import styles from "./dashboard.module.css";

/*
 * PNW data palette (10.1 values, restyled roles here in 10.3). Recharts writes
 * SVG attributes, where `var(--token)` does not resolve, so the four series
 * stay literals and mirror the role tokens:
 *
 *   WON      lichen   → the `--moss` data role
 *   FORECAST timber   → the slot the retired violet held
 *   OPEN     rain     → the `--slate` role (value unchanged, role was)
 *   LATE     cedar    → `--clay-ink`, the lifted clay for late work
 *   BRASS    golden   → the screen's one highlight (the deal-count line)
 *
 * The hues sit within 1.0–1.29 of each other in luminance, so colour can never
 * be the only channel: every series carries a name and every chart a legend.
 */
const WON = "#a3b19b"; // lichen
const FORECAST = "#b9ab93"; // timber
const OPEN = "#8b9fc2"; // rain — unchanged value, slate role
const LATE = "#e0a488"; // cedar lifted
const BRASS = "#dfa84a"; // golden

/*
 * 13.2 funnel readability: stage labels sit on a fixed-width category axis
 * and values print at the bar ends, so neither can be covered at 375px.
 * Long labels ellipsize with the full stage name kept in <title>.
 */
const STAGE_LABEL_MAX = 14;

function truncateStageLabel(label: string): string {
  return label.length > STAGE_LABEL_MAX
    ? `${label.slice(0, STAGE_LABEL_MAX - 1)}…`
    : label;
}

function compactStageValue(value: ReactNode): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return String(value ?? "");
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

function FunnelStageTick(props: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}) {
  const full = String(props.payload?.value ?? "");
  return (
    <text
      x={props.x}
      y={props.y}
      textAnchor="end"
      dominantBaseline="central"
      fontSize={12}
      fill="currentColor"
    >
      <title>{full}</title>
      {truncateStageLabel(full)}
    </text>
  );
}

export function DashboardCharts({
  monthly,
  funnel,
  winLoss,
  topOrganizations,
}: {
  monthly: MonthlyRevenue[];
  funnel: FunnelStage[];
  winLoss: WinLoss;
  topOrganizations: TopOrganization[];
}) {
  const winLossSlices = [
    { name: "Won", value: winLoss.wonValue },
    { name: "Lost", value: winLoss.lostValue },
  ];
  const winLossEmpty = winLoss.wonValue === 0 && winLoss.lostValue === 0;

  return (
    <div className={styles.charts}>
      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Revenue and deal volume</h2>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <YAxis
                yAxisId="count"
                orientation="right"
                allowDecimals={false}
              />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="actual"
                name="Won"
                fill={WON}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expected"
                name="Forecast"
                fill={FORECAST}
                isAnimationActive={false}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                name="Deals"
                stroke={BRASS}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Pipeline funnel</h2>
        <div className={styles.chartBody}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={funnel}
              layout="vertical"
              margin={{ top: 4, right: 40, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "currentColor" }}
                tickMargin={8}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                interval={0}
                tick={<FunnelStageTick />}
              />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="value"
                /* Not "Pipeline value": that string is the KPI tile's label on
                   this same screen, and e2e/crm.spec.ts matches it with a
                   strict getByText — a legend duplicating it resolves to two
                   elements and throws. */
                name="Pipeline by stage"
                fill={OPEN}
                isAnimationActive={false}
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey="value"
                  position="right"
                  fill="currentColor"
                  fontSize={12}
                  formatter={compactStageValue}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Win rate</h2>
        {winLossEmpty ? (
          <p className={styles.empty}>No closed deals yet</p>
        ) : (
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={winLossSlices}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  <Cell fill={WON} />
                  <Cell fill={LATE} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className={styles.chart}>
        <h2 className={styles.chartTitle}>Top organizations</h2>
        {topOrganizations.length === 0 ? (
          <p className={styles.empty}>No organizations</p>
        ) : (
          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOrganizations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Value by organization"
                  fill={OPEN}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
