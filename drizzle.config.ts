import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // generate does not connect; migrate needs a real DATABASE_URL
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
