import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, members } from "@/db/schema";
import { auth } from "./auth";

/** Current session or null (server components / route handlers / actions). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Redirects to /login when signed out. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Businesses the signed-in user can administer. */
export async function getMyBusinesses(userId: string) {
  return db
    .select({ business: businesses, role: members.role })
    .from(members)
    .innerJoin(businesses, eq(businesses.id, members.businessId))
    .where(eq(members.userId, userId))
    .orderBy(businesses.name);
}

/**
 * Tenant authorization for admin actions: throws unless the user is a member
 * of `businessId`. Call this at the top of every admin mutation.
 */
export async function assertMember(userId: string, businessId: string) {
  const [row] = await db
    .select({ role: members.role })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.businessId, businessId)));
  if (!row) throw new Error("Forbidden: not a member of this business");
  return row;
}
