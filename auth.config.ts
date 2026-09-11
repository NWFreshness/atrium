import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/lib/db/schema";

/**
 * Reachable without a session (Phase 6.2 added `/signup`). Everything else is
 * gated by the `authorized` callback below, so adding a public route is a
 * one-line change here rather than a matcher exception in `middleware.ts`.
 */
export const PUBLIC_AUTH_PATHS = ["/login", "/signup"];

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;

      if (PUBLIC_AUTH_PATHS.includes(request.nextUrl.pathname)) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
