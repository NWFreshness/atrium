import { AddContactButton } from "@/components/crm/contact-form";
import { ContactTable } from "@/components/crm/contact-table";
import styles from "@/components/crm/org.module.css";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/crm/constants";
import { listContactsAction } from "@/lib/crm/contact-actions";
import { listOrganizationsAction } from "@/lib/crm/org-actions";

function parseStatus(
  raw: string | string[] | undefined,
): ContactStatus | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    typeof value === "string" &&
    (CONTACT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as ContactStatus;
  }
  return undefined;
}

export default async function ContactsPage({
  searchParams,
}: PageProps<"/crm/contacts">) {
  const { q: rawQ, status: rawStatus } = await searchParams;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const status = parseStatus(rawStatus);
  const [contacts, organizations] = await Promise.all([
    listContactsAction({ q, status }),
    listOrganizationsAction(),
  ]);

  return (
    <main>
      <div className="atrium-pagetitle">
        <h1>Contacts</h1>
        <p className="atrium-sub">The people you work with</p>
      </div>
      <div className={styles["crm-toolbar"]}>
        <form
          className={styles["crm-search"]}
          action="/crm/contacts"
          method="get"
        >
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-search">Search</label>
            <input id="contact-search" name="q" defaultValue={q ?? ""} />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-status-filter">Status</label>
            <select
              id="contact-status-filter"
              name="status"
              defaultValue={status ?? ""}
            >
              <option value="">All</option>
              {CONTACT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Search</button>
        </form>
        <AddContactButton organizations={organizations} />
      </div>
      <ContactTable contacts={contacts} organizations={organizations} />
    </main>
  );
}
