import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/components/crm/org.module.css";
import { getContactAction } from "@/lib/crm/contact-actions";
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

  const organization = contact.organizationId
    ? await getOrganizationAction(contact.organizationId)
    : null;

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
    </main>
  );
}
