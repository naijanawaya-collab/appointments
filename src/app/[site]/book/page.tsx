import type { Metadata } from "next";
import { BookingFlowLoader } from "@/components/booking/booking-flow-loader";
import { siteHref } from "@/lib/links";
import { loadSite } from "@/lib/site";
import "@/styles/booking.css";

export async function generateMetadata(props: PageProps<"/[site]/book">): Promise<Metadata> {
  const { site } = await props.params;
  const { storefront } = await loadSite(site);
  const b = storefront.business;
  return { title: { absolute: `Book · ${b.shortName || b.name}` }, robots: { index: false } };
}

/** Booking flow (SCREENS.md §2). */
export default async function BookPage(props: PageProps<"/[site]/book">) {
  const { site } = await props.params;
  const { storefront, basePath } = await loadSite(site);
  const b = storefront.business;
  const logoId = storefront.config.logoMediaId;

  return (
    <>
      <noscript>
        <p className="p-4 text-center">Please enable JavaScript to book online.</p>
      </noscript>
      <BookingFlowLoader
        business={{
          id: b.id,
          name: b.name,
          short: b.shortName || b.name,
          mark: b.mark,
          logo: logoId ? (storefront.media[logoId] ?? null) : null,
          category: b.category,
          timezone: b.timezone,
          currency: b.currency,
          locale: b.locale,
          maxAdvanceDays: b.maxAdvanceDays,
        }}
        catalog={storefront.catalog}
        address={b.address}
        homeHref={siteHref(basePath, "/")}
      />
    </>
  );
}
