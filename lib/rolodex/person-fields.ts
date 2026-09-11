/**
 * The one Rolodex person field catalog.
 *
 * Two consumers read it: `lib/rolodex/import.ts` (the parser — Papa, `vcf` and
 * the query writes live there) and `components/rolodex/import-dialog.tsx` (the
 * mapping `<select>`). The dialog used to keep its own copy so 7.5's
 * client-boundary gate stayed green; the copies drifted immediately — the
 * server marked `name` required and the dialog did not.
 *
 * This module is data, deliberately: no value imports at all, so a client
 * component can read it without pulling the parse stack or the data layer into
 * its chunk. `required` is what creating a person needs, not what the select
 * enforces — the mapping `<select>` renders every entry.
 */

export type PersonField = {
  /** Also the `<option value>` in the mapping select. */
  readonly key: string;
  readonly label: string;
  /** Only `name` is needed to create a person. */
  readonly required?: boolean;
};

export const PERSON_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "jobTitle", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "birthday", label: "Birthday" },
  { key: "notes", label: "Notes" },
] as const satisfies readonly PersonField[];
