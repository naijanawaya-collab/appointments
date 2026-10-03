import type { Business } from "@/domain/business/resolve-business";
import { getCatalogCached } from "@/lib/tenant";
import { BookingWizard } from "@/components/booking/booking-wizard";

/**
 * A business's public booking page. Rendered identically whether the
 * visitor came through /book/[slug] or the business's custom domain.
 */
export async function Storefront({ business }: { business: Business }) {
  const catalog = await getCatalogCached(business.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-widest text-muted">Book an appointment</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{business.name}</h1>
        {business.description && <p className="mt-2 text-muted">{business.description}</p>}
        {business.address && <p className="mt-1 text-sm text-muted">{business.address}</p>}
      </header>

      {/* Only pass what the browser needs – never the whole business row. */}
      <BookingWizard
        business={{
          id: business.id,
          name: business.name,
          timezone: business.timezone,
          currency: business.currency,
          locale: business.locale,
          maxAdvanceDays: business.maxAdvanceDays,
        }}
        initialCatalog={catalog}
      />
    </main>
  );
}
