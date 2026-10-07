import Link from "next/link";
import { AddDealButton } from "@/components/crm/deal-form";
import { DealTable } from "@/components/crm/deal-table";
import styles from "@/components/crm/org.module.css";
import { listContactsAction } from "@/lib/crm/contact-actions";
import { DEAL_STAGES } from "@/lib/crm/constants";
import { listDealsAction } from "@/lib/crm/deal-actions";
import {
  closeBeforeExclusive,
  parseCloseDate,
  parseStage,
} from "@/lib/crm/deal-params";
import { formatDate } from "@/lib/crm/format";
import { listOrganizationsAction } from "@/lib/crm/org-actions";

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function DealsPage({
  searchParams,
}: PageProps<"/crm/deals">) {
  const {
    q: rawQ,
    stage: rawStage,
    closeAfter: rawCloseAfter,
    closeBefore: rawCloseBefore,
    organizationId: rawOrganizationId,
  } = await searchParams;
  const q = Array.isArray(rawQ) ? rawQ[0] : rawQ;
  const stage = parseStage(rawStage);
  const closeAfter = parseCloseDate(rawCloseAfter);
  const closeBeforeText = first(rawCloseBefore);
  const closeBeforeValue = parseCloseDate(rawCloseBefore);
  const exclusive = closeBeforeExclusive(rawCloseBefore);
  const closeBefore = exclusive ? new Date(exclusive) : undefined;
  // The organization list arrives before the deals query so a stale or
  // foreign id falls back to unfiltered here — the query below never
  // receives another tenant's id.
  const [organizations, contacts] = await Promise.all([
    listOrganizationsAction(),
    listContactsAction(),
  ]);
  const organization = organizations.find(
    (row) => row.id === first(rawOrganizationId),
  );
  const deals = await listDealsAction({
    q,
    stage,
    closeAfter,
    closeBefore,
    organizationId: organization?.id,
  });

  const parts: string[] = [];
  if (q?.trim()) {
    parts.push(`Search: ${q}`);
  }
  if (stage) {
    parts.push(`Stage: ${stage}`);
  }
  if (closeAfter || closeBeforeValue) {
    parts.push(
      closeAfter && closeBeforeValue
        ? `Close: ${formatDate(closeAfter)} – ${formatDate(closeBeforeValue)}`
        : closeAfter
          ? `Close: from ${formatDate(closeAfter)}`
          : `Close: through ${formatDate(closeBeforeValue ?? null)}`,
    );
  }
  if (organization) {
    parts.push(`Organization: ${organization.name}`);
  }

  return (
    <main>
      <div className="atrium-pagetitle">
        <h1>Deals</h1>
        <p className="atrium-sub">Open deals by stage</p>
      </div>
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
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-stage-filter">Stage</label>
            <select
              id="deal-stage-filter"
              name="stage"
              defaultValue={stage ?? ""}
            >
              <option value="">All</option>
              {DEAL_STAGES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-close-after">Close after</label>
            <input
              id="deal-close-after"
              name="closeAfter"
              type="date"
              defaultValue={first(rawCloseAfter) ?? ""}
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-close-before">Close before</label>
            <input
              id="deal-close-before"
              name="closeBefore"
              type="date"
              defaultValue={closeBeforeText ?? ""}
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-organization-filter">Organization</label>
            <select
              id="deal-organization-filter"
              name="organizationId"
              defaultValue={organization?.id ?? ""}
            >
              <option value="">All</option>
              {organizations.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Search</button>
        </form>
        {parts.length > 0 ? (
          <p className={styles["crm-filter-summary"]}>
            {`Filters: ${parts.join(", ")} · `}
            <Link href="/crm/deals">Clear filters</Link>
          </p>
        ) : null}
        <AddDealButton organizations={organizations} contacts={contacts} />
      </div>
      <DealTable
        deals={deals}
        organizations={organizations}
        contacts={contacts}
        filtered={parts.length > 0}
      />
    </main>
  );
}
