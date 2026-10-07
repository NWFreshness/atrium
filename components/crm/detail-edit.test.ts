/**
 * 11.5 — the DetailEdit contract gate.
 *
 * A source gate on purpose: the server/client boundary it guards only
 * fails at `next build` time, so this pins the trigger template and the
 * form/formProps shape cheaply — the trigger reads `Edit` / `Edit ${name}`
 * (the list-row template), the form arrives as a reference with a
 * serializable props bag, and the only `onClose` is the one the wrapper
 * creates client-side.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  `${process.cwd()}/components/crm/detail-edit.tsx`,
  "utf8",
);

describe("DetailEdit contract", () => {
  it("labels the trigger Edit with the accessible name Edit ${name}", () => {
    expect(src).toContain("aria-label={`Edit ${");
    expect(src).toMatch(/^\s+Edit\s*$/m);
  });

  it("takes the form as a reference plus serializable formProps", () => {
    expect(src).toContain("formProps");
    expect(src).toContain("{...formProps}");
  });

  it("creates onClose client-side exactly once, never forwarded from props", () => {
    expect(src.match(/onClose=\{/g)).toHaveLength(1);
  });

  it("mounts the form only after the trigger fires", () => {
    expect(src).toContain("{open ?");
  });

  it("value-imports only react and the CRM module", () => {
    const specs = [
      ...src.matchAll(/^(?:import|export)\b[^"']*\bfrom\s*"([^"]+)"/gm),
    ].map((match) => match[1]);
    expect(specs.length).toBeGreaterThan(0);
    for (const spec of specs) {
      expect([`react`, `./org.module.css`]).toContain(spec);
    }
  });
});
