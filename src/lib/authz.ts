import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getAccess, getAccessBySlug, type Access } from "@/domain/access/access";
import { hasRole, isPlatformAdmin, type Role } from "@/domain/access/roles";
import { DomainError } from "@/domain/errors";
import { getSession } from "./session";

/**
 * The one place admin authorization happens.
 *
 *   pages    →  requireShop(slug, role)   404s when the user has no access
 *                                          (never reveals that a shop exists)
 *   actions  →  authorize(businessId, role) throws FORBIDDEN
 *
 * Server Actions are reachable by direct POST, so every action calls
 * `authorize` itself; a page check is not enough.
 */

export type AdminContext = Access & { userId: string; email: string; name: string; isOperator: boolean };

const currentUser = cache(async () => {
  const session = await getSession();
  return session ? { userId: session.user.id, email: session.user.email, name: session.user.name } : null;
});

export const requireUser = cache(async () => {
  const user = await currentUser();
  if (!user) redirect("/login");
  return { ...user, isOperator: isPlatformAdmin(user.email) };
});

export const requireShop = cache(async (slug: string, role: Role = "staff"): Promise<AdminContext> => {
  const user = await requireUser();
  const access = await getAccessBySlug(user, slug);
  if (!access || !hasRole(access.role, role)) notFound();
  return { ...access, ...user };
});

export async function authorize(businessId: string, role: Role = "staff"): Promise<AdminContext> {
  const user = await currentUser();
  if (!user) throw new DomainError("FORBIDDEN", "Please sign in again.");
  const access = await getAccess(user, businessId);
  if (!access || !hasRole(access.role, role)) {
    throw new DomainError("FORBIDDEN", access ? "Only the shop owner can change this." : "You don't have access to this shop.");
  }
  return { ...access, ...user, isOperator: isPlatformAdmin(user.email) };
}

export const requireOperator = cache(async () => {
  const user = await requireUser();
  if (!user.isOperator) notFound();
  return user;
});

export async function authorizeOperator() {
  const user = await currentUser();
  if (!user || !isPlatformAdmin(user.email)) throw new DomainError("FORBIDDEN", "Only platform operators can do this.");
  return user;
}
