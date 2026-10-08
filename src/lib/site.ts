import "server-only";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getAccess } from "@/domain/access/access";
import { hasRole } from "@/domain/access/roles";
import type { Storefront } from "@/domain/storefront/service";
import { getSession } from "./session";
import { getCachedStorefront, getDraftStorefront, resolveSite, type Site } from "./tenant";

export type SiteData = Site & { storefront: Storefront; preview: boolean };

/**
 * Everything a `[site]` page needs. Visitors get the published storefront
 * from the cache. With Draft Mode on (enabled by the editor via
 * /api/preview) AND a signed-in owner of this shop (or a platform operator),
 * the draft is shown instead and never cached. Draft previews only exist on
 * the platform host, never on a shop's custom domain.
 */
export const loadSite = cache(async (siteParam: string): Promise<SiteData> => {
  const site = await resolveSite(siteParam);
  let preview = false;

  if (!site.isCustomDomain && (await draftMode()).isEnabled) {
    const session = await getSession();
    if (session) {
      const access = await getAccess({ userId: session.user.id, email: session.user.email }, site.business.id);
      preview = Boolean(access && hasRole(access.role, "owner"));
    }
  }

  const storefront = preview ? await getDraftStorefront(site.business.id) : await getCachedStorefront(site.business.id);
  if (!storefront) notFound();
  return { ...site, storefront, preview };
});
