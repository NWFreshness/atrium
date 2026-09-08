import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/crm/activity-form";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import styles from "@/components/crm/org.module.css";
import { listActivitiesAction } from "@/lib/crm/activity-actions";
import { getContactAction } from "@/lib/crm/contact-actions";
import { getDealAction } from "@/lib/crm/deal-actions";
import { formatDate, formatMoney } from "@/lib/crm/format";
import { getOrganizationAction } from "@/lib/crm/org-actions";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDealAction(id);
  if (!deal) {
    notFound();
  }

  const [organization, contact, activities] = await Promise.all([
    deal.organizationId
      ? getOrganizationAction(deal.organizationId)
      : Promise.resolve(null),
    deal.contactId ? getContactAction(deal.contactId) : Promise.resolve(null),
    listActivitiesAction({ dealId: id }),
  ]);

  return (
    <main>
      <h1>{deal.name}</h1>
      <dl className={styles["crm-detail"]}>
        <dt>Stage</dt>
        <dd>{deal.stage}</dd>
        <dt>Value</dt>
        <dd>{formatMoney(deal.value)}</dd>
        <dt>Probability</dt>
        <dd>{deal.probability}</dd>
        <dt>Close date</dt>
        <dd>{formatDate(deal.closeDate)}</dd>
        <dt>Organization</dt>
        <dd>
          {organization ? (
            <Link
              className={styles["crm-table-link"]}
              href={`/crm/organizations/${organization.id}`}
            >
              {organization.name}
            </Link>
          ) : (
            ""
          )}
        </dd>
        <dt>Contact</dt>
        <dd>
          {contact ? (
            <Link
              className={styles["crm-table-link"]}
              href={`/crm/contacts/${contact.id}`}
            >
              {contact.name}
            </Link>
          ) : (
            ""
          )}
        </dd>
      </dl>
      <h2>Activities</h2>
      <ActivityForm dealId={id} />
      <ActivityTimeline activities={activities} />
    </main>
  );
}
