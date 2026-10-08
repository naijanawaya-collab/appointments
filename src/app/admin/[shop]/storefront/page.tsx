import type { Metadata } from "next";
import { StorefrontEditor } from "@/components/admin/editor/storefront-editor";
import type { EditorMedia } from "@/components/admin/editor/types";
import { listMedia } from "@/domain/media/service";
import { getDraftConfig } from "@/domain/storefront/service";
import { requireShop } from "@/lib/authz";
import { publicShopUrl } from "@/lib/shop-url";

export const metadata: Metadata = { title: "Storefront" };

/** The storefront editor (owners only). */
export default async function StorefrontPage({ params }: PageProps<"/admin/[shop]/storefront">) {
  const ctx = await requireShop((await params).shop, "owner");
  const b = ctx.business;
  const [config, library, publicUrl] = await Promise.all([getDraftConfig(b.id), listMedia(b.id), publicShopUrl(b)]);
  const name = b.shortName || b.name;

  return (
    <StorefrontEditor
      shop={{
        id: b.id,
        slug: b.slug,
        name: b.name,
        shortName: b.shortName ?? "",
        mark: b.mark ?? "",
        tagline: b.tagline ?? "",
        publicUrl,
        adminBase: `/admin/${b.slug}`,
        seoDefaults: {
          title: `${name} – Book online`,
          description: b.tagline || b.description || `Book online at ${b.name}.`,
        },
      }}
      initialDraft={config.draft}
      initialPublished={config.published}
      initialSavedAt={config.updatedAt.toISOString()}
      initialLibrary={library as EditorMedia[]}
    />
  );
}
