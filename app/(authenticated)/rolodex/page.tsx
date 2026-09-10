import { TodayDashboard } from "@/components/rolodex/today-dashboard";
import styles from "@/components/rolodex/rolodex-subnav.module.css";
import { getDashboardAction } from "@/lib/rolodex/dashboard-actions";

export default async function RolodexPage() {
  const data = await getDashboardAction();

  return (
    <main className={styles["rolodex-page"]}>
      <div className="atrium-pagetitle">
        <h1>Today</h1>
        <p className="atrium-sub">listed by cadence urgency</p>
      </div>
      <TodayDashboard data={data} />
    </main>
  );
}
