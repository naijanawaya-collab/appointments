/**
 * Membership lookups behind every admin page and action (src/lib/authz.ts).
 * Operators get owner access to every shop.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, members } from "@/db/schema";
import type { Business } from "@/domain/business/resolve-business";
import { isPlatformAdmin, type Role } from "./roles";

export type Actor = { userId: string; email: string };

export type Access = { business: Business; role: Role; viaOperator: boolean };

async function memberRole(userId: string, businessId: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: members.role })
    .from(members)
    .where(and(eq(members.userId, userId), eq(members.businessId, businessId)));
  return row?.role ?? null;
}

async function accessTo(actor: Actor, business: Business | undefined): Promise<Access | null> {
  if (!business) return null;
  const role = await memberRole(actor.userId, business.id);
  if (role) return { business, role, viaOperator: false };
  if (isPlatformAdmin(actor.email)) return { business, role: "owner", viaOperator: true };
  return null;
}

/** Access by id (Server Actions receive ids). Inactive shops are still manageable. */
export async function getAccess(actor: Actor, businessId: string): Promise<Access | null> {
  const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  return accessTo(actor, business);
}

/** Access by slug (admin URLs are /admin/<slug>/…). */
export async function getAccessBySlug(actor: Actor, slug: string): Promise<Access | null> {
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug.toLowerCase()));
  return accessTo(actor, business);
}

export type ShopLink = { id: string; name: string; slug: string; role: Role };

/** Shops in the switcher. Operators see their own memberships (all shops live under /admin/shops). */
export async function listMyShops(userId: string): Promise<ShopLink[]> {
  return db
    .select({ id: businesses.id, name: businesses.name, slug: businesses.slug, role: members.role })
    .from(members)
    .innerJoin(businesses, eq(businesses.id, members.businessId))
    .where(eq(members.userId, userId))
    .orderBy(asc(businesses.name));
}
