import { listOrganizationsAction } from "@/lib/crm/org-actions";
import { AddOrganizationButton } from "@/components/crm/org-form";
import { OrgTable } from "@/components/crm/org-table";
import styles from "@/components/crm/org.module.css";

export default async function OrganizationsPage({
  searchParams,
}: PageProps<"/crm/organizations">) {
  const { q: raw } = await searchParams;
  const q = Array.isArray(raw) ? raw[0] : raw;
  const organizations = await listOrganizationsAction(q);

  return (
    <main>
      <h1>Organizations</h1>
      <div className={styles["crm-toolbar"]}>
        <form
          className={styles["crm-search"]}
          action="/crm/organizations"
          method="get"
        >
          <div className={styles["crm-field"]}>
            <label htmlFor="organization-search">Search</label>
            <input id="organization-search" name="q" defaultValue={q ?? ""} />
          </div>
          <button type="submit">Search</button>
        </form>
        <AddOrganizationButton />
      </div>
      <OrgTable organizations={organizations} />
    </main>
  );
}
