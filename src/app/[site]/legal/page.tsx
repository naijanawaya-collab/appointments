import type { Metadata } from "next";
import Link from "next/link";
import { siteHref } from "@/lib/links";
import { PLATFORM_NAME } from "@/lib/platform";
import { loadSite } from "@/lib/site";

export const metadata: Metadata = { title: "Impressum & Privacy" };

/**
 * Impressum (legally required for Austrian business websites) and the
 * privacy notice for online booking. Content comes from the shop's details.
 */
export default async function LegalPage(props: PageProps<"/[site]/legal">) {
  const { site } = await props.params;
  const { storefront, basePath } = await loadSite(site);
  const b = storefront.business;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-14 text-[15px] leading-relaxed">
      <Link href={siteHref(basePath, "/")} className="text-sm text-muted underline underline-offset-4">
        ← Back to {b.shortName || b.name}
      </Link>

      <h1 className="display mt-6 text-4xl">Impressum</h1>
      <dl className="mt-4 grid gap-1">
        <dt className="font-semibold">{b.name}</dt>
        {b.address && <dd>{b.address}</dd>}
        {b.phone && <dd>Phone: {b.phone}</dd>}
        {b.email && <dd>Email: {b.email}</dd>}
        {b.legalNotice && <dd className="mt-2 whitespace-pre-line">{b.legalNotice}</dd>}
      </dl>

      <h2 id="privacy" className="display mt-12 text-3xl">
        Privacy
      </h2>
      <div className="mt-4 space-y-3 text-muted">
        <p>
          When you book online, {b.name} stores your name, email address, optional phone number and note, and the details of your
          appointment. We use them only to manage your booking and to send you the confirmation and any changes.
        </p>
        <p>
          Your data is processed on our behalf by {PLATFORM_NAME} (booking software), hosted in the EU, and by our email provider for
          sending booking emails. We don’t use tracking cookies or advertising trackers on this site.
        </p>
        <p>
          You can ask us at any time what data we hold about you, or ask us to correct or delete it
          {b.email ? (
            <>
              {" "}
              by writing to <a href={`mailto:${b.email}`}>{b.email}</a>
            </>
          ) : null}
          . You also have the right to complain to the Austrian Data Protection Authority (dsb.gv.at).
        </p>
      </div>
    </main>
  );
}
