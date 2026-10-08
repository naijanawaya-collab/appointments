import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { robotsFor } from "@/domain/storefront/sitemap";
import { isPlatformHost, normalizeHostname } from "@/lib/hosts";

/** robots.txt for whichever host asked: the platform or a shop's own domain. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = normalizeHostname(h.get("host"));
  const proto = h.get("x-forwarded-proto") ?? (host === "localhost" || host.endsWith(".localhost") ? "http" : "https");
  const origin = `${proto}://${h.get("host")}`;
  return robotsFor(origin, isPlatformHost(host));
}
