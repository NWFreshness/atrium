import type { NextConfig } from "next";

export const SECURITY_HEADERS = [
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

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS.map((header) => ({
          key: header.name,
          value: header.value,
        })),
      },
    ];
  },
};

export default nextConfig;
