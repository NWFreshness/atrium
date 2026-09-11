import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "./next.config";

const EXPECTED = [
  { name: "X-Content-Type-Options", value: "nosniff" },
  { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { name: "X-Frame-Options", value: "DENY" },
  {
    name: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  {
    name: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    name: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
] as const;

describe("SECURITY_HEADERS", () => {
  it("is exactly the six isolation headers", () => {
    expect(SECURITY_HEADERS).toEqual([...EXPECTED]);
  });

  it("does not set script-src on the CSP (theme init is an inline script)", () => {
    const csp = SECURITY_HEADERS.find(
      (header) => header.name === "Content-Security-Policy",
    );
    expect(csp).toBeDefined();
    expect(csp?.value).not.toContain("script-src");
  });

  it("denies framing", () => {
    expect(
      SECURITY_HEADERS.some(
        (header) =>
          header.name === "X-Frame-Options" && header.value === "DENY",
      ),
    ).toBe(true);
  });
});

describe("nextConfig.headers", () => {
  it("keeps allowedDevOrigins for Playwright on 127.0.0.1", () => {
    expect(nextConfig.allowedDevOrigins).toEqual(["127.0.0.1"]);
  });

  it("sends the list on /:path* as Next key/value pairs", async () => {
    const headers = nextConfig.headers;
    expect(headers).toBeTypeOf("function");
    const result = await headers!();
    expect(result).toEqual([
      {
        source: "/:path*",
        headers: EXPECTED.map((header) => ({
          key: header.name,
          value: header.value,
        })),
      },
    ]);
  });
});
