import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/storefront/storefront";
import { normalizeHostname } from "@/lib/hosts";
import { getBusinessByHost } from "@/lib/tenant";

/**
 * Custom-domain storefront. Never visited directly: src/proxy.ts rewrites
 * e.g. https://brosbab.com/ to /sites/brosbab.com internally.
 */
async function loadBusiness(hostParam: string) {
  const host = normalizeHostname(decodeURIComponent(hostParam));
  // Defence in depth: only serve /sites/<host> when the request really came in on <host>.
  const requestHost = normalizeHostname((await headers()).get("host"));
  if (host !== requestHost) return null;
  return getBusinessByHost(host);
}

export async function generateMetadata(props: PageProps<"/sites/[host]">): Promise<Metadata> {
  const { host } = await props.params;
  const business = await loadBusiness(host);
  return business ? { title: { absolute: `${business.name} – Book online` } } : {};
}

export default async function CustomDomainPage(props: PageProps<"/sites/[host]">) {
  const { host } = await props.params;
  const business = await loadBusiness(host);
  if (!business) notFound();

  return <Storefront business={business} />;
}
