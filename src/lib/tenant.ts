import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { resolveBusiness, type Business } from "@/domain/business/resolve-business";
import { parseSiteParam } from "@/domain/business/site";
import { getCatalog } from "@/domain/catalog/get-catalog";
import { getStorefront, type Storefront } from "@/domain/storefront/service";
import { isPlatformHost, normalizeHostname } from "./hosts";

/**
 * Request-scoped and cross-request caching around the domain layer.
 * Storefront data is cached per business and invalidated on every owner
 * edit (`invalidateBusiness`), so public pages don't hit the DB per visitor.
 */

export const businessTag = (businessId: string) => `business:${businessId}`;

/** Call after any change that affects what a shop's public pages show. */
export function invalidateBusiness(businessId: string) {
  revalidateTag(businessTag(businessId), { expire: 0 });
}

export const getCachedStorefront = cache((businessId: string): Promise<Storefront | null> =>
  unstable_cache(() => getStorefront(businessId), ["storefront", businessId], {
    tags: [businessTag(businessId)],
    revalidate: 3600,
  })(),
);

export const getDraftStorefront = cache((businessId: string) => getStorefront(businessId, { draft: true }));

export const getBusinessBySlug = cache((slug: string) => resolveBusiness({ slug }));
export const getBusinessByHost = cache((hostname: string) => resolveBusiness({ hostname }));
export const getCatalogCached = cache((businessId: string) => getCatalog(businessId));

export type Site = {
  business: Business;
  /** "" on a custom domain, "/kaiser" on the platform */
  basePath: string;
  isCustomDomain: boolean;
};

/**
 * Resolves the `[site]` segment. A hostname segment is only valid when the
 * request really arrived on that host (the proxy rewrite), so /brosbab.com
 * on the platform 404s.
 */
export const resolveSite = cache(async (raw: string): Promise<Site> => {
  const parsed = parseSiteParam(raw);
  if (!parsed) notFound();
  const host = normalizeHostname((await headers()).get("host"));

  if (parsed.kind === "host") {
    if (parsed.hostname !== host || isPlatformHost(host)) notFound();
    const business = await getBusinessByHost(parsed.hostname);
    if (!business) notFound();
    return { business, basePath: "", isCustomDomain: true };
  }

  if (!isPlatformHost(host)) notFound();
  const business = await getBusinessBySlug(parsed.slug);
  if (!business) notFound();
  return { business, basePath: `/${business.slug}`, isCustomDomain: false };
});
