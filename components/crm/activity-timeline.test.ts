import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A source gate, not a runtime render. The timeline's correctness is owned
 * by `e2e/crm-activities.spec.ts` (browser journeys), so the unit test here
 * is the cheap regression net for the renamed accessible names, the dialog
 * form import, and the `useId`-driven `aria-labelledby` wiring — every
 * change that would silently make the e2e suite's locators stop matching.
 */
describe("activity-timeline", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/crm/activity-timeline.tsx"),
    "utf8",
  );
  const formSource = readFileSync(
    resolve(process.cwd(), "components/crm/activity-form.tsx"),
    "utf8",
  );

  it("imports the renamed activity form for editing", () => {
    expect(source).toContain('from "./activity-form"');
    expect(source).toContain("ActivityForm");
  });

  it("calls toggleActivityDoneAction", () => {
    expect(source).toContain("toggleActivityDoneAction");
  });

  it("calls deleteActivityAction", () => {
    expect(source).toContain("deleteActivityAction");
  });

  it("uses truncateActivityLabel for the row-control accessible names", () => {
    expect(source).toContain("truncateActivityLabel");
    expect(source).toContain("Edit activity:");
    expect(source).toContain("Delete activity:");
    expect(source).toContain("Mark activity:");
  });

  it("renders visible-at-rest Edit and Delete buttons (no display: none)", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "components/crm/org.module.css"),
      "utf8",
    );
    expect(source).toMatch(/aria-label=\{`Edit activity:/);
    expect(source).toMatch(/aria-label=\{`Delete activity:/);
    expect(styles).toContain(".crm-activity-actions");
    expect(styles).not.toContain("display: none");
  });

  it("mounts the dialog form with an onClose prop", () => {
    expect(source).toMatch(/<ActivityForm[^>]*onClose=/);
  });

  it("uses useId and aria-modal on the dialog form", () => {
    expect(formSource).toContain("useId");
    expect(formSource).toContain('aria-modal="true"');
    expect(formSource).toContain("aria-labelledby=");
    expect(formSource).toContain("Edit activity");
  });
});
