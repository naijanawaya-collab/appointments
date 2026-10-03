import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Better Auth – used for business owners / staff logging into /admin.
 *
 * Customers do NOT need an account to book (guest booking + "manage booking"
 * link by email, coming in Phase 1). That keeps booking friction low and
 * avoids cross-domain cookie issues on tenant custom domains.
 *
 * Sign-up is disabled: admins are created by the seed script (and later by
 * an invite flow), so random people can't register on the platform.
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  trustedOrigins: [
    ...(process.env.PLATFORM_HOSTS ?? "localhost")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .flatMap((h) => [`http://${h}:3000`, `https://${h}`]),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
  // Must be last: lets server actions set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
