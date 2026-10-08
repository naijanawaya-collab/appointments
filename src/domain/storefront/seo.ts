/**
 * SEO for storefronts (BEHAVIOUR.md §7): page metadata and schema.org
 * JSON-LD. Pure, so it's unit-tested.
 */
import type { Metadata } from "next";
import { weeklyHours } from "@/domain/hours/hours";
import { formatMoney } from "@/lib/format";
import { PLATFORM_URL } from "@/lib/platform";
import type { Storefront } from "./service";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Canonical public URL: the verified primary custom domain, else the platform URL. */
export function canonicalUrl(sf: Pick<Storefront, "primaryDomain" | "business">): string {
  return sf.primaryDomain ? `https://${sf.primaryDomain}` : `${PLATFORM_URL}/${sf.business.slug}`;
}

export function storefrontTitle(sf: Storefront): string {
  return sf.config.seo.title || `${sf.business.shortName || sf.business.name} – Book online`;
}

export function storefrontDescription(sf: Storefront): string {
  return sf.config.seo.description || sf.business.tagline || sf.business.description || `Book online at ${sf.business.name}.`;
}

export function storefrontMetadata(sf: Storefront, opts: { preview: boolean; isCustomDomain: boolean }): Metadata {
  const title = storefrontTitle(sf);
  const description = storefrontDescription(sf);
  const url = canonicalUrl(sf);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: sf.business.name, type: "website", locale: "en_GB" },
    twitter: { card: "summary_large_image", title, description },
    robots: opts.preview ? { index: false, follow: false } : undefined,
  };
}

export function storefrontJsonLd(sf: Storefront) {
  const b = sf.business;
  const prices = sf.catalog.services.map((s) => s.priceCents);
  const week = weeklyHours(sf.openingHours);
  return {
    "@context": "https://schema.org",
    "@type": b.category === "beauty" ? "BeautySalon" : "HairSalon",
    name: b.name,
    url: canonicalUrl(sf),
    description: storefrontDescription(sf),
    ...(b.phone && { telephone: b.phone }),
    ...(b.email && { email: b.email }),
    ...(b.address && { address: { "@type": "PostalAddress", streetAddress: b.address } }),
    ...(b.lat != null && b.lon != null && { geo: { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lon } }),
    ...(prices.length && {
      priceRange: `${formatMoney(Math.min(...prices), b.currency, b.locale)} – ${formatMoney(Math.max(...prices), b.currency, b.locale)}`,
    }),
    openingHoursSpecification: week.flatMap((d, i) =>
      d.ranges.map(([opens, closes]) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_NAMES[i], opens, closes })),
    ),
    ...(b.ratingValue &&
      b.ratingCount && {
        aggregateRating: { "@type": "AggregateRating", ratingValue: b.ratingValue, reviewCount: b.ratingCount },
      }),
  };
}
