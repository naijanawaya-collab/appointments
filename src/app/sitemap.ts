import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { platformSitemap, shopEntries } from "@/domain/storefront/sitemap";
import { listIndexedShops, shopForDomain } from "@/domain/storefront/sitemap-data";
import { isPlatformHost, normalizeHostname } from "@/lib/hosts";

/**
 * sitemap.xml per host: the platform lists the landing page and shops
 * without their own domain; a custom domain lists just its shop.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = normalizeHostname(h.get("host"));
  const proto = h.get("x-forwarded-proto") ?? (host === "localhost" || host.endsWith(".localhost") ? "http" : "https");
  const origin = `${proto}://${h.get("host")}`;

  if (isPlatformHost(host)) return platformSitemap(origin, await listIndexedShops());
  const shop = await shopForDomain(host);
  return shop ? shopEntries(origin, shop.updatedAt) : [];
}
