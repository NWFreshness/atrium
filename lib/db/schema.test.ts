import { describe, expect, it } from "vitest";
import { accounts, sessions, tenants, userRoleEnum, users } from "./schema";

describe("schema", () => {
  it("defines tenants, users, accounts, and sessions", () => {
    expect(tenants).toBeDefined();
    expect(users).toBeDefined();
    expect(accounts).toBeDefined();
    expect(sessions).toBeDefined();
  });

  it("restricts user roles to owner, demo, and member", () => {
    expect(userRoleEnum.enumValues).toEqual(["owner", "demo", "member"]);
  });

  it("does not export crm, space, or rolodex tables", async () => {
    const schemaModule = await import("./schema");
    const names = Object.keys(schemaModule).map((key) => key.toLowerCase());
    expect(names.some((name) => name.includes("crm"))).toBe(false);
    expect(names.some((name) => name.includes("space"))).toBe(false);
    expect(names.some((name) => name.includes("rolodex"))).toBe(false);
  });
});
