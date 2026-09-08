import { notFound } from "next/navigation";
import { getOrganizationAction } from "@/lib/crm/org-actions";
import styles from "@/components/crm/org.module.css";

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
    </main>
  );
}
