"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CONTACT_STATUSES, type ContactStatus } from "@/lib/crm/constants";
import {
  createContactAction,
  updateContactAction,
} from "@/lib/crm/contact-actions";
import type { Contact, Organization } from "@/lib/crm/queries";
import styles from "./org.module.css";

type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  status: ContactStatus;
  organizationId: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function ContactForm({
  contact,
  organizations,
  onClose,
}: {
  contact?: Contact | null;
  organizations: Organization[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<ContactFormValues>({
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    jobTitle: contact?.jobTitle ?? "",
    status: contact?.status ?? "lead",
    organizationId: contact?.organizationId ?? "",
  });
  const title = contact ? `Edit ${contact.name}` : "Add contact";
  const titleId = "contact-form-title";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      return;
    }
    const input = {
      name,
      email: emptyToNull(values.email),
      phone: emptyToNull(values.phone),
      jobTitle: emptyToNull(values.jobTitle),
      status: values.status,
      organizationId: emptyToNull(values.organizationId),
    };
    setPending(true);
    try {
      if (contact) {
        await updateContactAction(contact.id, input);
      } else {
        await createContactAction(input);
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
            <label htmlFor="contact-name">Name</label>
            <input
              id="contact-name"
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
            <label htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-phone">Phone</label>
            <input
              id="contact-phone"
              name="phone"
              value={values.phone}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-job-title">Job title</label>
            <input
              id="contact-job-title"
              name="jobTitle"
              value={values.jobTitle}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  jobTitle: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-status">Status</label>
            <select
              id="contact-status"
              name="status"
              value={values.status}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  status: event.target.value as ContactStatus,
                }))
              }
            >
              {CONTACT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="contact-organization">Organization</label>
            <select
              id="contact-organization"
              name="organizationId"
              value={values.organizationId}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  organizationId: event.target.value,
                }))
              }
            >
              <option value="">None</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
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

export function AddContactButton({
  organizations,
}: {
  organizations: Organization[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add contact
      </button>
      {open ? (
        <ContactForm
          organizations={organizations}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
