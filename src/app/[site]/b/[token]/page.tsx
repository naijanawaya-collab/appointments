import type { Metadata } from "next";
import { ManageBooking } from "@/components/manage/manage-booking";
import { siteHref } from "@/lib/links";
import { loadSite } from "@/lib/site";

// The URL contains a secret token: keep it out of search engines and referrers.
export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Manage booking (SCREENS.md §3). Only shows bookings of this shop. */
export default async function ManagePage(props: PageProps<"/[site]/b/[token]">) {
  const { site, token } = await props.params;
  const { business, basePath, storefront } = await loadSite(site);
  const logoId = storefront.config.logoMediaId;
  return (
    <ManageBooking
      token={token}
      businessId={business.id}
      homeHref={siteHref(basePath, "/")}
      bookHref={siteHref(basePath, "/book")}
      logo={logoId ? storefront.media[logoId] : null}
    />
  );
}
