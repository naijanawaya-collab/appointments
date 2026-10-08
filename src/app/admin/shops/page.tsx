import type { Metadata } from "next";
import Link from "next/link";
import { setShopActiveAction } from "@/app/admin/_actions/operator";
import { listMyShops } from "@/domain/access/access";
import { listAllShops } from "@/domain/business/admin";
import { CreateShopForm } from "@/components/admin/create-shop-form";
import { ActionButton } from "@/components/admin/form-kit";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireOperator } from "@/lib/authz";
import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/platform";

export const metadata: Metadata = { title: "All shops" };

/** Operator console (PLATFORM_ADMIN_EMAILS only): every shop + create a new one. */
export default async function ShopsPage() {
  const operator = await requireOperator();
  const [shops, mine] = await Promise.all([listAllShops(), listMyShops(operator.userId)]);

  return (
    <main className="ad-main" style={{ paddingBottom: 48 }}>
      <div className="ad-main-inner">
        <header className="ad-head">
          <div className="ad-head-text">
            <span className="ad-kicker">{PLATFORM_NAME} · operator</span>
            <h1 className="ad-title">All shops</h1>
          </div>
          <div className="ad-actions">
            {mine[0] && (
              <Link href={`/admin/${mine[0].slug}`} className="btn btn-secondary">
                My shop
              </Link>
            )}
            <SignOutButton />
          </div>
        </header>

        <ul className="ad-list" aria-label="Shops">
          {shops.map((s) => (
            <li key={s.id} className="ad-row" style={{ flexWrap: "wrap" }}>
              <span className="ad-row-main">
                <Link href={`/admin/${s.slug}`} className="ad-row-title">
                  {s.name}
                </Link>
                <span className="ad-row-meta">
                  /{s.slug} · {s.owners.length ? s.owners.join(", ") : "no owner"}
                </span>
              </span>
              <span className="ad-row-side">
                {!s.isActive && <span className="pill pill-danger">Offline</span>}
                <a href={`${PLATFORM_URL}/${s.slug}`} target="_blank" rel="noreferrer" className="btn btn-link">
                  View ↗
                </a>
                <ActionButton
                  action={setShopActiveAction.bind(null, s.id, !s.isActive)}
                  className="btn btn-link"
                  confirm={s.isActive ? `Take ${s.name} offline? Its pages and booking stop working.` : undefined}
                  confirmLabel="Take offline"
                >
                  {s.isActive ? "Take offline" : "Put online"}
                </ActionButton>
              </span>
            </li>
          ))}
        </ul>

        <section className="ad-card" aria-labelledby="new-shop">
          <h2 id="new-shop">New shop</h2>
          <p className="ad-card-intro">Creates the shop with the chosen style and emails the owner an invite. They add services, team and hours themselves.</p>
          <CreateShopForm platformUrl={PLATFORM_URL} />
        </section>
      </div>
    </main>
  );
}
