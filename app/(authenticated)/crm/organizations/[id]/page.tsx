import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/crm/org.module.css";
import { listContactsAction } from "@/lib/crm/contact-actions";
import { listDealsAction } from "@/lib/crm/deal-actions";
import { getOrganizationAction } from "@/lib/crm/org-actions";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organization = await getOrganizationAction(id);
  if (!organization) {
    notFound();
  }

  const [contacts, deals] = await Promise.all([
    listContactsAction({ organizationId: id }),
    listDealsAction({ organizationId: id }),
  ]);

  return (
    <main>
      <h1>{organization.name}</h1>
      <dl className={styles["crm-detail"]}>
        <dt>Website</dt>
        <dd>{organization.website ?? ""}</dd>
        <dt>Industry</dt>
        <dd>{organization.industry ?? ""}</dd>
        <dt>Notes</dt>
        <dd>{organization.notes ?? ""}</dd>
      </dl>
      <h2>Contacts</h2>
      {contacts.length === 0 ? (
        <p className={styles["crm-empty"]}>No contacts</p>
      ) : (
        <ul>
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                className={styles["crm-table-link"]}
                href={`/crm/contacts/${contact.id}`}
              >
                {contact.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
    </main>
  );
}
