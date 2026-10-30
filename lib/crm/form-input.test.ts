import { describe, expect, it } from "vitest";
import { contactFormInput, dealFormInput } from "./form-input";

const contact = {
  name: "  Ada Lovelace ",
  email: " ada@example.com ",
  phone: "",
  jobTitle: "   ",
  status: "lead" as const,
  organizationId: "",
};

const deal = {
  name: " Renewal ",
  value: "1200.50",
  stage: "Proposal" as const,
  probability: "50",
  closeDate: "2026-03-01",
  organizationId: "org-1",
  contactId: "",
};

describe("contactFormInput", () => {
  it("trims the name and turns blank optional fields into null", () => {
    expect(contactFormInput(contact)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      phone: null,
      jobTitle: null,
      status: "lead",
      organizationId: null,
    });
  });

  it("keeps a chosen organization", () => {
    expect(
      contactFormInput({ ...contact, organizationId: "org-1" })?.organizationId,
    ).toBe("org-1");
  });

  it("builds nothing for a blank name, so the form does not submit", () => {
    expect(contactFormInput({ ...contact, name: "   " })).toBeNull();
  });
});

describe("dealFormInput", () => {
  it("parses the numbers and the close date and nulls blank references", () => {
    expect(dealFormInput(deal)).toEqual({
      name: "Renewal",
      value: 1200.5,
      stage: "Proposal",
      probability: 50,
      closeDate: new Date("2026-03-01T00:00:00.000Z"),
      organizationId: "org-1",
      contactId: null,
    });
  });

  it("leaves a blank close date unset", () => {
    expect(dealFormInput({ ...deal, closeDate: "  " })?.closeDate).toBeNull();
  });

  it("builds nothing for a blank name or a number that is not one", () => {
    expect(dealFormInput({ ...deal, name: " " })).toBeNull();
    expect(dealFormInput({ ...deal, value: "lots" })).toBeNull();
    expect(dealFormInput({ ...deal, probability: "likely" })).toBeNull();
  });

  it("reads an empty amount as zero, as the form always has", () => {
    expect(dealFormInput({ ...deal, value: "" })?.value).toBe(0);
  });
});
