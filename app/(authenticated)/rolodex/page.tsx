import { TodayDashboard } from "@/components/rolodex/today-dashboard";
import styles from "@/components/rolodex/rolodex-subnav.module.css";
import { getDashboardAction } from "@/lib/rolodex/dashboard-actions";

export default async function RolodexPage() {
  const data = await getDashboardAction();

  return (
    <main className={styles["rolodex-page"]}>
      <h1>Today</h1>
      <TodayDashboard data={data} />
    </main>
  );
}
