import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/crm/activity-form";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { DealForm } from "@/components/crm/deal-form";
import { DetailEdit } from "@/components/crm/detail-edit";
import styles from "@/components/crm/org.module.css";
import { listActivitiesAction } from "@/lib/crm/activity-actions";
import { listContactsAction } from "@/lib/crm/contact-actions";
import { getDealAction } from "@/lib/crm/deal-actions";
import { formatDate, formatMoney } from "@/lib/crm/format";
import { listOrganizationsAction } from "@/lib/crm/org-actions";

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

  const [organizations, contacts, activities] = await Promise.all([
    listOrganizationsAction(),
    listContactsAction(),
    listActivitiesAction({ dealId: id }),
  ]);

  // Display resolves from the same tenant lists that feed the form's
  // selects, so the `<dd>` links and the dialog options cannot drift.
  const organization = deal.organizationId
    ? (organizations.find(
        (candidate) => candidate.id === deal.organizationId,
      ) ?? null)
    : null;
  const contact = deal.contactId
    ? (contacts.find((candidate) => candidate.id === deal.contactId) ?? null)
    : null;

  return (
    <main>
      <div className={styles["crm-detail-title"]}>
        <div className="atrium-pagetitle">
          <h1>{deal.name}</h1>
          <p className="atrium-sub">Deal · {deal.stage}</p>
        </div>
        <DetailEdit
          form={DealForm}
          formProps={{ deal, organizations, contacts }}
          name={deal.name}
        />
      </div>
      <dl className={styles["crm-detail"]}>
        <dt>Stage</dt>
        <dd>{deal.stage}</dd>
        <dt>Value</dt>
        <dd>{formatMoney(deal.value)}</dd>
        <dt>Probability</dt>
        <dd>{deal.probability}%</dd>
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
