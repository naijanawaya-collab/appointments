/**
 * Shop details, reviews, people with access, and (for operators) creating
 * shops.
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { account, businesses, members, reviews, storefrontConfigs, user } from "@/db/schema";
import type { Role } from "@/domain/access/roles";
import { DomainError, PG_UNIQUE_VIOLATION, pgErrorCode } from "@/domain/errors";
import { defaultConfig } from "@/domain/storefront/config";
import type { BusinessDetailsInput, CreateShopInput } from "@/validation/admin";

export async function updateBusinessDetails(businessId: string, input: BusinessDetailsInput) {
  const [row] = await db.update(businesses).set(input).where(eq(businesses.id, businessId)).returning();
  if (!row) throw new DomainError("NOT_FOUND", "Shop not found.");
  return row;
}

// ── reviews ──────────────────────────────────────────────────────────────────

export async function listReviews(businessId: string) {
  return db.select().from(reviews).where(eq(reviews.businessId, businessId)).orderBy(asc(reviews.position), asc(reviews.createdAt));
}

export async function addReview(businessId: string, input: { quote: string; author: string; source: string }) {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${reviews.position}) + 1, 0)::int` })
    .from(reviews)
    .where(eq(reviews.businessId, businessId));
  const [row] = await db.insert(reviews).values({ businessId, ...input, position: next }).returning();
  return row;
}

export async function removeReview(businessId: string, reviewId: string) {
  const rows = await db
    .delete(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.businessId, businessId)))
    .returning({ id: reviews.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Review not found.");
}

// ── people ───────────────────────────────────────────────────────────────────

export async function listMembers(businessId: string) {
  return db
    .select({
      id: members.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: members.role,
      createdAt: members.createdAt,
      /** False until they've used their invite link. */
      hasPassword: sql<boolean>`exists (select 1 from ${account} where ${account.userId} = ${user.id} and ${account.providerId} = 'credential')`,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.businessId, businessId))
    .orderBy(asc(members.createdAt));
}

/**
 * Finds or creates the login for `email` and makes it a member with `role`.
 * New users have no password yet: they set one through the invite link.
 * Returns whether the user is new (decides the email copy).
 */
export async function ensureMember(businessId: string, input: { email: string; name: string; role: Role }) {
  const email = input.email.toLowerCase();
  return db.transaction(async (tx) => {
    let [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email));
    const isNewUser = !existing;
    if (!existing) {
      [existing] = await tx
        .insert(user)
        .values({ id: randomUUID(), email, name: input.name, emailVerified: false })
        .returning({ id: user.id });
    }
    const [member] = await tx
      .insert(members)
      .values({ businessId, userId: existing.id, role: input.role })
      .onConflictDoUpdate({ target: [members.businessId, members.userId], set: { role: input.role } })
      .returning();
    return { userId: existing.id, memberId: member.id, isNewUser };
  });
}

/** The last owner can't be removed (the shop would be orphaned). */
export async function removeMember(businessId: string, memberId: string) {
  await db.transaction(async (tx) => {
    const rows = await tx.select().from(members).where(eq(members.businessId, businessId));
    const target = rows.find((m) => m.id === memberId);
    if (!target) throw new DomainError("NOT_FOUND", "Person not found.");
    if (target.role === "owner" && rows.filter((m) => m.role === "owner").length === 1) {
      throw new DomainError("CONFLICT", "A shop needs at least one owner.");
    }
    await tx.delete(members).where(and(eq(members.id, memberId), eq(members.businessId, businessId)));
  });
}

// ── operator ─────────────────────────────────────────────────────────────────

export async function listAllShops() {
  return db
    .select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      isActive: businesses.isActive,
      createdAt: businesses.createdAt,
      owners: sql<string[]>`coalesce(array_agg(${user.email}) filter (where ${members.role} = 'owner'), '{}')`,
    })
    .from(businesses)
    .leftJoin(members, eq(members.businessId, businesses.id))
    .leftJoin(user, eq(user.id, members.userId))
    .groupBy(businesses.id)
    .orderBy(asc(businesses.name));
}

export async function isSlugTaken(slug: string) {
  const [row] = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug));
  return Boolean(row);
}

/**
 * Creates an empty shop ready for its owner: business row, storefront config
 * from the chosen preset, owner login + membership. Opening hours, services
 * and team are filled in by the owner afterwards.
 */
export async function createShop(input: CreateShopInput) {
  try {
    const business = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(businesses)
        .values({
          name: input.name,
          shortName: input.name.length <= 24 ? input.name : null,
          mark: input.name.trim().charAt(0).toUpperCase(),
          slug: input.slug,
          category: input.category,
          timezone: input.timezone,
        })
        .returning();
      const config = defaultConfig(input.preset);
      await tx.insert(storefrontConfigs).values({ businessId: row.id, draft: config, published: config });
      return row;
    });
    const owner = await ensureMember(business.id, { email: input.ownerEmail, name: input.ownerName, role: "owner" });
    return { business, owner };
  } catch (err) {
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) throw new DomainError("CONFLICT", "That address is taken. Pick another.");
    throw err;
  }
}

export async function setShopActive(businessId: string, isActive: boolean) {
  await db.update(businesses).set({ isActive }).where(eq(businesses.id, businessId));
}
