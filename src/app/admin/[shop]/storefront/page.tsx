import type { Metadata } from "next";
import { requireShop } from "@/lib/authz";
import { publicShopUrl } from "@/lib/shop-url";

export const metadata: Metadata = { title: "Storefront" };

export default async function StorefrontPage({ params }: PageProps<"/admin/[shop]/storefront">) {
  const ctx = await requireShop((await params).shop, "owner");
  const url = await publicShopUrl(ctx.business);
  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Storefront</h1>
        </div>
        <div className="ad-actions">
          <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary">
            View storefront ↗
          </a>
        </div>
      </header>
      <p className="ad-card-intro">Your storefront is live at {url.replace(/^https?:\/\//, "")}.</p>
    </>
  );
}
