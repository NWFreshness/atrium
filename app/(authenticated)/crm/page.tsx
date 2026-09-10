import { DashboardCharts } from "@/components/crm/dashboard-charts";
import { DashboardFollowUps } from "@/components/crm/dashboard-followups";
import styles from "@/components/crm/dashboard.module.css";
import { StatTile } from "@/components/crm/stat-tile";
import { getDashboardAction } from "@/lib/crm/dashboard-actions";
import { formatDate, formatMoney } from "@/lib/crm/format";
import Link from "next/link";

export default async function CrmPage() {
  const data = await getDashboardAction();

  return (
    <main className={styles.page}>
      <div className="atrium-pagetitle">
        <h1>Dashboard</h1>
        <p className="atrium-sub">All figures tenant-scoped</p>
      </div>
      <div className={styles.tiles}>
        <StatTile
          label="Open deals"
          value={data.tiles.openDealCount}
          tone="count"
          index={1}
        />
        <StatTile
          label="Pipeline value"
          value={formatMoney(data.tiles.pipelineValue)}
          tone="open"
          index={2}
        />
        <StatTile
          label="Expected revenue"
          value={formatMoney(data.tiles.expectedRevenue)}
          tone="forecast"
          index={3}
        />
        <StatTile
          label="Deals won"
          value={data.tiles.dealsWon}
          sub="Trailing 6 months"
          tone="won"
          index={4}
        />
        <StatTile
          label="Revenue won"
          value={formatMoney(data.tiles.revenueWon)}
          sub="Trailing 6 months"
          tone="won"
          index={5}
        />
      </div>
      <DashboardCharts
        monthly={data.monthly}
        funnel={data.funnel}
        winLoss={data.winLoss}
        topOrganizations={data.topOrganizations}
      />
      <div className={styles.feeds}>
        <section className={styles.feed}>
          <h2 className={styles.feedTitle}>Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className={styles.empty}>No recent activity</p>
          ) : (
            <ul className={styles.feedList}>
              {data.recentActivity.map((activity) => (
                <li key={activity.id} className={styles.feedItem}>
                  <span>{activity.description}</span>
                  <span className={styles.feedMeta}>
                    {formatDate(activity.occurredAt)} · {activity.type}
                    {activity.contactId ? (
                      <>
                        {" · "}
                        <Link
                          className={styles.feedLink}
                          href={`/crm/contacts/${activity.contactId}`}
                        >
                          Contact
                        </Link>
                      </>
                    ) : null}
                    {activity.dealId ? (
                      <>
                        {" · "}
                        <Link
                          className={styles.feedLink}
                          href={`/crm/deals/${activity.dealId}`}
                        >
                          Deal
                        </Link>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <DashboardFollowUps
          overdue={data.followUps.overdue}
          upcoming={data.followUps.upcoming}
        />
      </div>
    </main>
  );
}
