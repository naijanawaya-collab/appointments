import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { resetPasswordEmail } from "@/domain/notifications/account-emails";
import { sendEmail } from "./email";
import { appUrl } from "./platform";

/**
 * Better Auth – used for business owners / staff logging into /admin.
 *
 * Customers do NOT need an account to book (guest booking + "manage booking"
 * link by email, coming in Phase 1). That keeps booking friction low and
 * avoids cross-domain cookie issues on tenant custom domains.
 *
 * Sign-up is disabled: logins are created by operators (new shop) and
 * owners (invite), so random people can't register on the platform.
 * Invites reuse the password-reset token (src/lib/invites.ts).
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
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour (invites get 24 h, see invites.ts)
    revokeSessionsOnPasswordReset: true,
    // Our own page, not Better Auth's redirect endpoint: one less hop, same token check.
    sendResetPassword: async ({ user, token }) => {
      await sendEmail({
        to: user.email,
        ...resetPasswordEmail({ name: user.name, url: appUrl(`/reset-password?token=${encodeURIComponent(token)}`) }),
      });
    },
  },
  // On in production (sign-in: 3 tries / 10 s per IP). The e2e suite signs in often from one IP.
  rateLimit: { enabled: process.env.AUTH_RATE_LIMIT !== "off" && process.env.NODE_ENV === "production" },
  // Reset/invite tokens are stored hashed: a database leak doesn't leak working links.
  verification: { storeIdentifier: "hashed" },
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
