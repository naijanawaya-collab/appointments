import "server-only";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Storefront } from "@/domain/storefront/service";
import { getSession, isMemberOf } from "./session";
import { getCachedStorefront, getDraftStorefront, resolveSite, type Site } from "./tenant";

export type SiteData = Site & { storefront: Storefront; preview: boolean };

/**
 * Everything a `[site]` page needs. Visitors get the published storefront
 * from the cache. With Draft Mode on (enabled by the editor) AND a signed-in
 * member of this shop, the draft is shown instead and never cached.
 */
export const loadSite = cache(async (siteParam: string): Promise<SiteData> => {
  const site = await resolveSite(siteParam);
  let preview = false;

  if (!site.isCustomDomain && (await draftMode()).isEnabled) {
    const session = await getSession();
    preview = Boolean(session && (await isMemberOf(session.user.id, site.business.id)));
  }

  const storefront = preview ? await getDraftStorefront(site.business.id) : await getCachedStorefront(site.business.id);
  if (!storefront) notFound();
  return { ...site, storefront, preview };
});
