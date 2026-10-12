import type { ContactStatus, DealStage } from "./constants";
import type { CreateContactInput, CreateDealInput } from "./queries-shared";

/** What the contact dialog holds while it is being typed into. */
export type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  status: ContactStatus;
  organizationId: string;
};

/** What the deal dialog holds: numbers and the date are still text. */
export type DealFormValues = {
  name: string;
  value: string;
  stage: DealStage;
  probability: string;
  closeDate: string;
  organizationId: string;
  contactId: string;
};

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** A `yyyy-mm-dd` date input as midnight UTC; blank is no date. */
export function inputValueToDate(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

/** The action input for a contact form, or `null` when it must not submit. */
export function contactFormInput(
  values: ContactFormValues,
): CreateContactInput | null {
  const name = values.name.trim();
  if (!name) {
    return null;
  }
  return {
    name,
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    jobTitle: emptyToNull(values.jobTitle),
    status: values.status,
    organizationId: emptyToNull(values.organizationId),
  };
}

/** The action input for a deal form, or `null` when it must not submit. */
export function dealFormInput(values: DealFormValues): CreateDealInput | null {
  const name = values.name.trim();
  if (!name) {
    return null;
  }
  const value = Number(values.value);
  const probability = Number(values.probability);
  if (!Number.isFinite(value) || !Number.isFinite(probability)) {
    return null;
  }
  return {
    name,
    value,
    stage: values.stage,
    probability,
    closeDate: inputValueToDate(values.closeDate),
    organizationId: emptyToNull(values.organizationId),
    contactId: emptyToNull(values.contactId),
  };
}
