"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  DEAL_STAGES,
  STAGE_PROBABILITY,
  type DealStage,
} from "@/lib/crm/constants";
import {
  createDealAction,
  updateDealAction,
} from "@/lib/crm/deal-actions";
import type { Contact, Deal, Organization } from "@/lib/crm/queries";
import styles from "./org.module.css";

type DealFormValues = {
  name: string;
  value: string;
  stage: DealStage;
  probability: string;
  closeDate: string;
  organizationId: string;
  contactId: string;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function dateToInputValue(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function inputValueToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

function initialValues(deal?: Deal | null): DealFormValues {
  const stage = deal?.stage ?? "New";
  return {
    name: deal?.name ?? "",
    value: deal ? String(deal.value) : "",
    stage,
    probability: String(deal?.probability ?? STAGE_PROBABILITY[stage]),
    closeDate: dateToInputValue(deal?.closeDate),
    organizationId: deal?.organizationId ?? "",
    contactId: deal?.contactId ?? "",
  };
}

export function DealForm({
  deal,
  organizations,
  contacts,
  onClose,
}: {
  deal?: Deal | null;
  organizations: Organization[];
  contacts: Contact[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<DealFormValues>(() =>
    initialValues(deal),
  );
  const title = deal ? `Edit ${deal.name}` : "Add deal";
  const titleId = "deal-form-title";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = values.name.trim();
    if (!name) {
      return;
    }
    const value = Number(values.value);
    const probability = Number(values.probability);
    if (!Number.isFinite(value) || !Number.isFinite(probability)) {
      return;
    }
    const input = {
      name,
      value,
      stage: values.stage,
      probability,
      closeDate: inputValueToDate(values.closeDate),
      organizationId: emptyToNull(values.organizationId),
      contactId: emptyToNull(values.contactId),
    };
    setPending(true);
    try {
      if (deal) {
        await updateDealAction(deal.id, input);
      } else {
        await createDealAction(input);
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
            <label htmlFor="deal-name">Name</label>
            <input
              id="deal-name"
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
            <label htmlFor="deal-value">Value</label>
            <input
              id="deal-value"
              name="value"
              type="number"
              step="0.01"
              value={values.value}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  value: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-stage">Stage</label>
            <select
              id="deal-stage"
              name="stage"
              value={values.stage}
              onChange={(event) => {
                const stage = event.target.value as DealStage;
                setValues((current) => ({
                  ...current,
                  stage,
                  probability: String(STAGE_PROBABILITY[stage]),
                }));
              }}
            >
              {DEAL_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-probability">Probability</label>
            <input
              id="deal-probability"
              name="probability"
              type="number"
              min={0}
              max={100}
              value={values.probability}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  probability: event.target.value,
                }))
              }
              required
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-close-date">Close date</label>
            <input
              id="deal-close-date"
              name="closeDate"
              type="date"
              value={values.closeDate}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  closeDate: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-organization">Organization</label>
            <select
              id="deal-organization"
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
          <div className={styles["crm-field"]}>
            <label htmlFor="deal-contact">Contact</label>
            <select
              id="deal-contact"
              name="contactId"
              value={values.contactId}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  contactId: event.target.value,
                }))
              }
            >
              <option value="">None</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
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

export function AddDealButton({
  organizations,
  contacts,
}: {
  organizations: Organization[];
  contacts: Contact[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add deal
      </button>
      {open ? (
        <DealForm
          organizations={organizations}
          contacts={contacts}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
