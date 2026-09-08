"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  createOrganizationAction,
  updateOrganizationAction,
} from "@/lib/crm/org-actions";
import type { Organization } from "@/lib/crm/queries";
import styles from "./org.module.css";

type OrgFormValues = {
  name: string;
  website: string;
  industry: string;
  notes: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function OrgForm({
  organization,
  onClose,
}: {
  organization?: Organization | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<OrgFormValues>({
    name: organization?.name ?? "",
    website: organization?.website ?? "",
    industry: organization?.industry ?? "",
    notes: organization?.notes ?? "",
  });
  const title = organization ? `Edit ${organization.name}` : "Add organization";
  const titleId = "org-form-title";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      return;
    }
    const input = {
      name,
      website: emptyToNull(values.website),
      industry: emptyToNull(values.industry),
      notes: emptyToNull(values.notes),
    };
    setPending(true);
    try {
      if (organization) {
        await updateOrganizationAction(organization.id, input);
      } else {
        await createOrganizationAction(input);
      }
      router.refresh();
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles["crm-dialog-backdrop"]}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles["crm-dialog"]}
      >
        <h2 id={titleId}>{title}</h2>
        <form onSubmit={onSubmit}>
          <div className={styles["crm-field"]}>
            <label htmlFor="org-name">Name</label>
            <input
              id="org-name"
              name="name"
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="org-website">Website</label>
            <input
              id="org-website"
              name="website"
              value={values.website}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  website: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="org-industry">Industry</label>
            <input
              id="org-industry"
              name="industry"
              value={values.industry}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  industry: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="org-notes">Notes</label>
            <textarea
              id="org-notes"
              name="notes"
              rows={4}
              value={values.notes}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-form-actions"]}>
            <button type="button" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" disabled={pending}>
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddOrganizationButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add organization
      </button>
      {open ? <OrgForm onClose={() => setOpen(false)} /> : null}
    </>
  );
}
