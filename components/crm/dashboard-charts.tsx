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
 * Coral data palette. The series are the signal tokens themselves: a
 * `var(--token)` in an SVG presentation attribute resolves like any CSS
 * value, so the charts follow the theme instead of pinning literals.
 *
 *   WON      green  → `--moss`
 *   FORECAST brown  → `--timber`
 *   OPEN     umber  → `--slate`
 *   WARM     ochre  → `--ochre`
 *   LATE     rust   → `--clay-ink`
 *   BRASS    coral  → the settled state (the Won stage, the deal-count line)
 *
 * Colour is never the only channel: every series carries a name and every
 * chart a legend; a bar coloured per category is named by its axis.
 */
const WON = "var(--moss)";
const FORECAST = "var(--timber)";
const OPEN = "var(--slate)";
const WARM = "var(--ochre)";
const LATE = "var(--clay-ink)";
const BRASS = "var(--brass)";

/* One colour per funnel stage, Won in coral. Neighbours never share a hue
   family, so the two browns (OPEN, FORECAST) are kept apart. */
const STAGE_FILLS = [OPEN, WARM, FORECAST, WON, BRASS];

/* Organizations have no stage, so coral (the settled state) is left out. */
const ORG_FILLS = [OPEN, WARM, WON, FORECAST, LATE];

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
              {/* No swatch: each bar has its own colour, named on the axis. */}
              <Legend iconSize={0} />
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
                {funnel.map((stage, index) => (
                  <Cell
                    key={stage.label}
                    fill={STAGE_FILLS[Math.min(index, STAGE_FILLS.length - 1)]}
                  />
                ))}
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
                {/* No swatch: each bar has its own colour, named on the axis. */}
                <Legend iconSize={0} />
                <Bar
                  dataKey="value"
                  name="Value by organization"
                  fill={OPEN}
                  isAnimationActive={false}
                >
                  {topOrganizations.map((organization, index) => (
                    <Cell
                      key={`${index}-${organization.name}`}
                      fill={ORG_FILLS[index % ORG_FILLS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
