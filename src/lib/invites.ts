import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account } from "@/db/schema";
import { inviteEmail } from "@/domain/notifications/account-emails";
import { auth } from "./auth";
import { sendEmail } from "./email";
import { appUrl } from "./platform";

export const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * An invite is a single-use password-reset token that lasts 24 h instead of
 * 1 h. It's created through Better Auth's own adapter so it's stored (hashed)
 * exactly like a reset token and redeemed by the same /reset-password page.
 */
export async function createInviteToken(userId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  const ctx = await auth.$context;
  await ctx.internalAdapter.createVerificationValue({
    identifier: `reset-password:${token}`,
    value: userId,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });
  return token;
}

async function hasPassword(userId: string) {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));
  return Boolean(row);
}

/** Emails the invite. Users who already have a password just get a sign-in link. */
export async function sendInvite(input: { userId: string; email: string; shopName: string; inviterName: string | null; role: "owner" | "staff" }) {
  const existing = await hasPassword(input.userId);
  const url = existing
    ? appUrl("/login")
    : appUrl(`/reset-password?invite=1&token=${encodeURIComponent(await createInviteToken(input.userId))}`);
  await sendEmail({
    to: input.email,
    ...inviteEmail({ shopName: input.shopName, inviterName: input.inviterName, url, role: input.role, hasPassword: existing }),
  });
  return { url };
}
