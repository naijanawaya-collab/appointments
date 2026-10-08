import type { Viewport } from "next";
import { PreviewBridge } from "@/components/site/preview-bridge";
import { ThemeStyle, themeViewport } from "@/components/site/theme-style";
import { loadSite } from "@/lib/site";

/**
 * Every page of a shop (storefront, booking, manage, legal) gets the shop's
 * theme as server-rendered CSS variables: correct colours on first paint,
 * no JavaScript needed (T-1, T-2).
 */
export async function generateViewport(props: LayoutProps<"/[site]">): Promise<Viewport> {
  const { site } = await props.params;
  const { storefront } = await loadSite(site);
  return { width: "device-width", initialScale: 1, viewportFit: "cover", ...themeViewport(storefront.config) };
}

export default async function SiteLayout(props: LayoutProps<"/[site]">) {
  const { site } = await props.params;
  const { storefront, preview } = await loadSite(site);

  return (
    <>
      <ThemeStyle config={storefront.config} />
      {preview && (
        <>
          <PreviewBridge />
          <div className="preview-banner" role="status">
            Draft preview: only you can see this.{" "}
            <a href={`/api/preview?shop=${storefront.business.slug}&exit=1`}>Show the live page</a>
          </div>
        </>
      )}
      {props.children}
    </>
  );
}
