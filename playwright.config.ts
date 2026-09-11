import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env");
} catch {
  // CI injects secrets; local runs need a gitignored .env
}

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // `npm run dev` inherits this process's env, so a flag on the command line
    // reaches the Next server Playwright starts:
    //   AUTH_SIGNUP_ENABLED=true npx playwright test
    // e2e/accounts.spec.ts reads the same variable from the *runner's* env to choose
    // between the signup journeys and the closed page, so setting it in
    // `webServer.env` would not work either: the spec would then run the closed test
    // against an open server. Two runs are the coverage — CI does both.
    // Caveat: `reuseExistingServer` (local, non-CI) means an already-running dev
    // server is used as-is, and *that* server's env decides the flag, not this one.
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
