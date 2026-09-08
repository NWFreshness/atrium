import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/crm/activity-form";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import styles from "@/components/crm/org.module.css";
import { listActivitiesAction } from "@/lib/crm/activity-actions";
import { getContactAction } from "@/lib/crm/contact-actions";
import { listDealsAction } from "@/lib/crm/deal-actions";
import { getOrganizationAction } from "@/lib/crm/org-actions";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contact = await getContactAction(id);
  if (!contact) {
    notFound();
  }

  const [organization, deals, activities] = await Promise.all([
    contact.organizationId
      ? getOrganizationAction(contact.organizationId)
      : Promise.resolve(null),
    listDealsAction({ contactId: id }),
    listActivitiesAction({ contactId: id }),
  ]);

  return (
    <main>
      <h1>{contact.name}</h1>
      <dl className={styles["crm-detail"]}>
        <dt>Email</dt>
        <dd>{contact.email ?? ""}</dd>
        <dt>Phone</dt>
        <dd>{contact.phone ?? ""}</dd>
        <dt>Job title</dt>
        <dd>{contact.jobTitle ?? ""}</dd>
        <dt>Status</dt>
        <dd>{contact.status}</dd>
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
      </dl>
      <h2>Deals</h2>
      {deals.length === 0 ? (
        <p className={styles["crm-empty"]}>No deals</p>
      ) : (
        <ul>
          {deals.map((deal) => (
            <li key={deal.id}>
              <Link
                className={styles["crm-table-link"]}
                href={`/crm/deals/${deal.id}`}
              >
                {deal.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2>Activities</h2>
      <ActivityForm contactId={id} />
      <ActivityTimeline activities={activities} />
    </main>
  );
}
