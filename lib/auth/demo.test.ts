import { describe, expect, it } from "vitest";
import { demoCredentials } from "./demo";

describe("demoCredentials", () => {
  it("returns the configured demo pair", () => {
    expect(
      demoCredentials({
        AUTH_DEMO_EMAIL: "guest@example.com",
        AUTH_DEMO_PASSWORD: "a-long-demo-password",
      }),
    ).toEqual({ email: "guest@example.com", password: "a-long-demo-password" });
  });

  it("falls back to the seed's default demo email", () => {
    expect(
      demoCredentials({ AUTH_DEMO_PASSWORD: "a-long-demo-password" }),
    ).toEqual({ email: "demo@atrium.local", password: "a-long-demo-password" });
  });

  it("is closed when the password is missing or empty", () => {
    expect(
      demoCredentials({ AUTH_DEMO_EMAIL: "guest@example.com" }),
    ).toBeNull();
    expect(
      demoCredentials({
        AUTH_DEMO_EMAIL: "guest@example.com",
        AUTH_DEMO_PASSWORD: "",
      }),
    ).toBeNull();
  });

  it("never falls back to the owner account", () => {
    expect(
      demoCredentials({
        AUTH_OWNER_EMAIL: "owner@example.com",
        AUTH_OWNER_PASSWORD: "owner-password",
      }),
    ).toBeNull();
  });
});
