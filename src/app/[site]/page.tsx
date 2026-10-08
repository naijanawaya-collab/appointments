import type { Metadata } from "next";
import { Storefront } from "@/components/storefront/storefront";
import { storefrontJsonLd, storefrontMetadata } from "@/domain/storefront/seo";
import { buildStorefrontView } from "@/domain/storefront/view";
import { loadSite } from "@/lib/site";

export async function generateMetadata(props: PageProps<"/[site]">): Promise<Metadata> {
  const { site } = await props.params;
  const s = await loadSite(site);
  return storefrontMetadata(s.storefront, { preview: s.preview, isCustomDomain: s.isCustomDomain });
}

/** A shop's public page (SCREENS.md §1), on /<slug> and on its custom domain. */
export default async function StorefrontPage(props: PageProps<"/[site]">) {
  const { site } = await props.params;
  const { storefront, basePath } = await loadSite(site);
  const view = buildStorefrontView(storefront, { now: new Date(), basePath });

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storefrontJsonLd(storefront)).replace(/</g, "\\u003c") }}
      />
      <Storefront view={view} />
    </>
  );
}
