/** The seed's default demo address (`lib/db/seed.ts`), used when the env names none. */
const DEFAULT_DEMO_EMAIL = "demo@atrium.local";

export type DemoCredentials = { email: string; password: string };

/**
 * The demo account's sign-in pair, read on the server for the login page's
 * one-click "Enter the demo". Null means the button is not offered: without a
 * password there is nothing to sign in with. These values never reach the
 * browser — the server action signs in with them directly.
 */
export function demoCredentials(
  env: Record<string, string | undefined>,
): DemoCredentials | null {
  const password = env.AUTH_DEMO_PASSWORD;
  if (!password) {
    return null;
  }
  return { email: env.AUTH_DEMO_EMAIL || DEFAULT_DEMO_EMAIL, password };
}
