import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/crm/org.module.css";
import { listContactsAction } from "@/lib/crm/contact-actions";
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

  const contacts = await listContactsAction({ organizationId: id });

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
    </main>
  );
}
