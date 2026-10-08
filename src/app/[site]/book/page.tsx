import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { Providers } from "@/components/providers";
import { loadSite } from "@/lib/site";

export async function generateMetadata(props: PageProps<"/[site]/book">): Promise<Metadata> {
  const { site } = await props.params;
  const { storefront } = await loadSite(site);
  return { title: { absolute: `Book · ${storefront.business.shortName || storefront.business.name}` }, robots: { index: false } };
}

/** Booking flow (SCREENS.md §2). */
export default async function BookPage(props: PageProps<"/[site]/book">) {
  const { site } = await props.params;
  const { storefront } = await loadSite(site);
  const b = storefront.business;

  return (
    <Providers>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">{b.name}</h1>
        <BookingWizard
          business={{
            id: b.id,
            name: b.name,
            timezone: b.timezone,
            currency: b.currency,
            locale: b.locale,
            maxAdvanceDays: b.maxAdvanceDays,
          }}
          initialCatalog={storefront.catalog}
        />
      </main>
    </Providers>
  );
}
