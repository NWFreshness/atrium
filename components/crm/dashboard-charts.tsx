"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  FunnelStage,
  MonthlyRevenue,
  TopOrganization,
  WinLoss,
} from "@/lib/crm/dashboard";
import styles from "./dashboard.module.css";

const WON = "#8fae83"; // moss
const FORECAST = "#a88fc0"; // violet
const OPEN = "#8b9fc2"; // slate
const LATE = "#cd7258"; // clay
const BRASS = "#dfa33c";

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
              <YAxis yAxisId="count" orientation="right" allowDecimals={false} />
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
            <BarChart data={funnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="label" width={90} />
              <Tooltip />
              <Bar dataKey="value" name="Value" fill={OPEN} isAnimationActive={false} />
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
                <Bar
                  dataKey="value"
                  name="Value"
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
