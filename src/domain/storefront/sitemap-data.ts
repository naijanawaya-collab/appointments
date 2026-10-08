/** Database side of robots/sitemap (see sitemap.ts for the pure builders). */
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { businessDomains, businesses } from "@/db/schema";
import type { IndexedShop } from "./sitemap";

/** Active shops with their verified primary domain (DB). */
export async function listIndexedShops(): Promise<IndexedShop[]> {
  const [rows, domains] = await Promise.all([
    db.select({ id: businesses.id, slug: businesses.slug, updatedAt: businesses.updatedAt }).from(businesses).where(eq(businesses.isActive, true)),
    db
      .select({ businessId: businessDomains.businessId, hostname: businessDomains.hostname, isPrimary: businessDomains.isPrimary })
      .from(businessDomains)
      .where(isNotNull(businessDomains.verifiedAt)),
  ]);
  return rows.map((r) => {
    const own = domains.filter((d) => d.businessId === r.id && !d.hostname.endsWith(".localhost"));
    return { slug: r.slug, domain: (own.find((d) => d.isPrimary) ?? own[0])?.hostname ?? null, updatedAt: r.updatedAt };
  });
}

/** The shop behind a custom domain, if it's active. */
export async function shopForDomain(hostname: string): Promise<IndexedShop | null> {
  const [row] = await db
    .select({ slug: businesses.slug, updatedAt: businesses.updatedAt })
    .from(businessDomains)
    .innerJoin(businesses, eq(businesses.id, businessDomains.businessId))
    .where(and(eq(businessDomains.hostname, hostname), eq(businesses.isActive, true)));
  return row ? { ...row, domain: hostname } : null;
}
