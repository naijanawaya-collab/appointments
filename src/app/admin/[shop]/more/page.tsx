import type { Metadata } from "next";
import Link from "next/link";
import { listMyShops } from "@/domain/access/access";
import { adminHref, navFor } from "@/components/admin/nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireShop } from "@/lib/authz";
import { publicShopUrl } from "@/lib/shop-url";

export const metadata: Metadata = { title: "More" };

/** Mobile "More" tab: everything that isn't in the tab bar. */
export default async function MorePage({ params }: PageProps<"/admin/[shop]/more">) {
  const ctx = await requireShop((await params).shop);
  const [shops, storefront] = await Promise.all([listMyShops(ctx.userId), publicShopUrl(ctx.business)]);
  return (
    <>
      <h1 className="ad-title">More</h1>
      <ul className="ad-list">
        {navFor(ctx.role).map((n) => (
          <li key={n.key} className="ad-row">
            <Link href={adminHref(ctx.business.slug, n.path)} className="ad-row-title" style={{ flex: 1 }}>
              {n.label}
            </Link>
          </li>
        ))}
        <li className="ad-row">
          <a href={storefront} target="_blank" rel="noreferrer" className="ad-row-title" style={{ flex: 1 }}>
            View storefront ↗
          </a>
        </li>
      </ul>
      {(shops.length > 1 || ctx.isOperator) && (
        <>
          <h2 className="ad-group-title">Switch shop</h2>
          <ul className="ad-list">
            {shops.map((s) => (
              <li key={s.slug} className="ad-row">
                <Link href={adminHref(s.slug)} className="ad-row-title" style={{ flex: 1 }} aria-current={s.slug === ctx.business.slug ? "page" : undefined}>
                  {s.name}
                </Link>
              </li>
            ))}
            {ctx.isOperator && (
              <li className="ad-row">
                <Link href="/admin/shops" className="ad-row-title" style={{ flex: 1 }}>
                  All shops…
                </Link>
              </li>
            )}
          </ul>
        </>
      )}
      <p className="ad-row-meta">Signed in as {ctx.email}</p>
      <div>
        <SignOutButton />
      </div>
    </>
  );
}
