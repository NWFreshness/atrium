"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CircleCounts, MonthCount } from "@/lib/rolodex/dashboard";
import styles from "./today.module.css";

/* Rack data palette (Phase 14) — the same signal tokens the CRM charts use.
   The four series are the four cadence states, so each one is the colour that
   state carries in the readouts and chips on this screen: on cadence = led
   green, due within seven days = amber, overdue = red, snoozed/off = blue;
   the neutral is the plain count (interactions logged). Each series is
   labelled directly, so colour is never the only channel. */
const IN_TOUCH = "var(--moss)"; // on cadence
const DUE = "var(--brass)"; // due within seven days
const OVERDUE = "var(--clay-ink)"; // overdue
const SNOOZED = "var(--slate)"; // snoozed/off
const COUNT = "var(--timber)"; // interactions logged

export function TodayCharts({
  months,
  circles,
}: {
  months: MonthCount[];
  circles: CircleCounts[];
}) {
  const noInteractions = months.every((row) => row.count === 0);
  const noPeople = circles.every((row) => row.total === 0);

  return (
    <div className={styles["rolodex-today-charts"]}>
      <section className={styles["rolodex-today-chart"]}>
        <h2>Interactions logged per month</h2>
        {noInteractions ? (
          <p className={styles["rolodex-today-empty"]}>
            No interactions logged
          </p>
        ) : (
          <div className={styles["rolodex-today-chart-body"]}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  name="Interactions"
                  fill={COUNT}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <section className={styles["rolodex-today-chart"]}>
        <h2>People per circle</h2>
        {noPeople ? (
          <p className={styles["rolodex-today-empty"]}>No people</p>
        ) : (
          <div className={styles["rolodex-today-chart-body"]}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={circles}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="inTouch"
                  name="In touch"
                  stackId="s"
                  fill={IN_TOUCH}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="dueSoon"
                  name="Due soon"
                  stackId="s"
                  fill={DUE}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="overdue"
                  name="Overdue"
                  stackId="s"
                  fill={OVERDUE}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="snoozed"
                  name="Snoozed"
                  stackId="s"
                  fill={SNOOZED}
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
