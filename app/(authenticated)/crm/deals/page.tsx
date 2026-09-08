import { AddDealButton } from "@/components/crm/deal-form";
import { DealTable } from "@/components/crm/deal-table";
import styles from "@/components/crm/org.module.css";
import { listContactsAction } from "@/lib/crm/contact-actions";
import { listDealsAction } from "@/lib/crm/deal-actions";
import { listOrganizationsAction } from "@/lib/crm/org-actions";

export default async function DealsPage({
  searchParams,
}: PageProps<"/crm/deals">) {
  const { q: rawQ } = await searchParams;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const [deals, organizations, contacts] = await Promise.all([
    listDealsAction({ q }),
    listOrganizationsAction(),
    listContactsAction(),
  ]);

  return (
    <main>
      <h1>Deals</h1>
      <div className={styles["crm-toolbar"]}>
        <form
          className={styles["crm-search"]}
          action="/crm/deals"
          method="get"
        >
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-search">Search</label>
            <input id="deal-search" name="q" defaultValue={q ?? ""} />
          </div>
          <button type="submit">Search</button>
        </form>
        <AddDealButton organizations={organizations} contacts={contacts} />
      </div>
      <DealTable
        deals={deals}
        organizations={organizations}
        contacts={contacts}
      />
    </main>
  );
}
