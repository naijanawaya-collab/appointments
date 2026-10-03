/**
 * Tenant resolution.
 *
 * The rest of the app never cares HOW a business was found – by slug on the
 * platform (/book/demo-barber) or by custom domain (brosbab.com). It just
 * receives a `Business`.
 *
 * Domain layer rule: no React / Next.js imports in src/domain/**, so this code
 * can later move behind a separate API or into a mobile backend unchanged.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessDomains, businesses } from "@/db/schema";
import { normalizeHostname } from "@/lib/hosts";

export type Business = typeof businesses.$inferSelect;

export type TenantLookup = { slug: string } | { hostname: string };

export async function resolveBusiness(lookup: TenantLookup): Promise<Business | null> {
  if ("slug" in lookup) {
    const [row] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.slug, lookup.slug.toLowerCase()), eq(businesses.isActive, true)))
      .limit(1);
    return row ?? null;
  }

  const hostname = normalizeHostname(lookup.hostname);
  if (!hostname) return null;
  const [row] = await db
    .select({ business: businesses })
    .from(businessDomains)
    .innerJoin(businesses, eq(businesses.id, businessDomains.businessId))
    .where(and(eq(businessDomains.hostname, hostname), eq(businesses.isActive, true)))
    .limit(1);
  return row?.business ?? null;
}
