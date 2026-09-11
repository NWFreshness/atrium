import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authorizeCredentials } from "./lib/auth/authorize";
import { createLazyDrizzleThrottleStore } from "./lib/auth/throttle-drizzle";
import { requestIp } from "./lib/auth/throttle";
import { findUserByEmail } from "./lib/auth/users";
import { verifyPassword } from "./lib/db/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        return authorizeCredentials(
          credentials ?? {},
          { findByEmail: findUserByEmail },
          verifyPassword,
          {
            store: createLazyDrizzleThrottleStore(),
            ip: requestIp(request),
          },
        );
      },
    }),
  ],
});
