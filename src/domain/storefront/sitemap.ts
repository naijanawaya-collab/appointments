/**
 * robots.txt and sitemap.xml contents, per host (pure, unit-tested):
 *
 *   platform host  → landing + legal pages + every active shop at its
 *                    canonical address (its verified custom domain if any)
 *   custom domain  → just that shop's pages
 *
 * Booking-management links (secret tokens), the admin, auth pages and the
 * API are never meant for search engines.
 */
export type IndexedShop = { slug: string; domain: string | null; updatedAt: Date };

export type SitemapEntry = { url: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly"; priority?: number };

export function robotsFor(origin: string, isPlatform: boolean) {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: isPlatform ? ["/admin", "/api/", "/login", "/forgot-password", "/reset-password", "/*/b/"] : ["/api/", "/b/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

/** Canonical page URLs of one shop. */
export function shopEntries(base: string, updatedAt: Date): SitemapEntry[] {
  return [
    { url: base, lastModified: updatedAt, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/book`, lastModified: updatedAt, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/legal`, lastModified: updatedAt, changeFrequency: "monthly", priority: 0.2 },
  ];
}

export function platformSitemap(origin: string, shops: IndexedShop[]): SitemapEntry[] {
  return [
    { url: origin, changeFrequency: "monthly", priority: 1 },
    { url: `${origin}/impressum`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${origin}/privacy`, changeFrequency: "monthly", priority: 0.2 },
    // Shops on their own domain are listed by that domain's sitemap instead.
    ...shops.filter((s) => !s.domain).flatMap((s) => shopEntries(`${origin}/${s.slug}`, s.updatedAt)),
  ];
}
