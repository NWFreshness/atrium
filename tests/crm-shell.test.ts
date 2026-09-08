import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("CRM shell", () => {
  it("creates the five section routes and subnav", () => {
    const files = [
      "app/(authenticated)/crm/layout.tsx",
      "app/(authenticated)/crm/page.tsx",
      "app/(authenticated)/crm/organizations/page.tsx",
      "app/(authenticated)/crm/contacts/page.tsx",
      "app/(authenticated)/crm/deals/page.tsx",
      "app/(authenticated)/crm/pipeline/page.tsx",
      "components/crm/crm-subnav.tsx",
      "components/crm/crm-subnav.module.css",
    ];

    for (const file of files) {
      expect(existsSync(resolve(root, file)), file).toBe(true);
    }
  });

  it("lists the five CRM section hrefs in the subnav", () => {
    const subnav = source("components/crm/crm-subnav.tsx");
    expect(subnav).toContain('"/crm"');
    expect(subnav).toContain('"/crm/organizations"');
    expect(subnav).toContain('"/crm/contacts"');
    expect(subnav).toContain('"/crm/deals"');
    expect(subnav).toContain('"/crm/pipeline"');
  });
});
