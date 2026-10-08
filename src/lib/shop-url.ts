import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { businessDomains } from "@/db/schema";
import { PLATFORM_URL } from "./platform";

/**
 * Public URL of a shop page, for links the shop sends out (walk-in
 * confirmations, "view storefront"): the verified primary custom domain if
 * there is one, otherwise the platform address.
 */
export async function publicShopUrl(business: { id: string; slug: string }, path = "/"): Promise<string> {
  const rows = await db
    .select({ hostname: businessDomains.hostname, isPrimary: businessDomains.isPrimary })
    .from(businessDomains)
    .where(and(eq(businessDomains.businessId, business.id), isNotNull(businessDomains.verifiedAt)));
  const host = (rows.find((r) => r.isPrimary) ?? rows[0])?.hostname;
  const suffix = path === "/" ? "" : path;
  return host ? `https://${host}${suffix}` : `${PLATFORM_URL}/${business.slug}${suffix}`;
}
