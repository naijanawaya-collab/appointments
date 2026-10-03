import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ManageBooking } from "@/components/manage/manage-booking";
import { normalizeHostname } from "@/lib/hosts";
import { getBusinessByHost } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Manage booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Custom-domain version of /manage/[token] (reached via the proxy rewrite). */
export default async function SiteManagePage(props: PageProps<"/sites/[host]/manage/[token]">) {
  const { host, token } = await props.params;
  const hostname = normalizeHostname(decodeURIComponent(host));
  if (hostname !== normalizeHostname((await headers()).get("host"))) notFound();

  const business = await getBusinessByHost(hostname);
  if (!business) notFound();

  return <ManageBooking token={token} businessId={business.id} bookHref="/" />;
}
