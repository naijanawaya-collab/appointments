import type { Metadata } from "next";
import { listMyShops } from "@/domain/access/access";
import { requireShop } from "@/lib/authz";
import { SidebarNav, TabBar } from "@/components/admin/admin-nav";
import { ShopSwitcher } from "@/components/admin/shop-switcher";
import { SignOutButton } from "@/components/admin/sign-out-button";

export async function generateMetadata({ params }: LayoutProps<"/admin/[shop]">): Promise<Metadata> {
  const ctx = await requireShop((await params).shop);
  return { title: { default: ctx.business.shortName || ctx.business.name, template: `%s · ${ctx.business.shortName || ctx.business.name}` } };
}

/** Admin shell (screens/admin-dashboard.jpg): sidebar ≥ 900px, bottom tab bar below. */
export default async function ShopAdminLayout({ children, params }: LayoutProps<"/admin/[shop]">) {
  const ctx = await requireShop((await params).shop);
  const shops = await listMyShops(ctx.userId);
  const current = { name: ctx.business.shortName || ctx.business.name, slug: ctx.business.slug, mark: (ctx.business.mark || ctx.business.name).charAt(0).toUpperCase() };

  return (
    <div className="ad-shell">
      <aside className="ad-sidebar">
        <ShopSwitcher current={current} shops={shops} isOperator={ctx.isOperator} />
        <SidebarNav slug={ctx.business.slug} role={ctx.role} />
        <div className="ad-sidebar-foot">
          <span className="ad-user" title={ctx.email}>
            {ctx.email}
            {ctx.viaOperator ? " · operator" : ""}
          </span>
          <SignOutButton className="btn btn-secondary" />
        </div>
      </aside>
      <main className="ad-main" id="main">
        <div className="ad-main-inner">
          <div className="ad-topbar">
            <ShopSwitcher current={current} shops={shops} isOperator={ctx.isOperator} />
          </div>
          {children}
        </div>
      </main>
      <TabBar slug={ctx.business.slug} role={ctx.role} />
    </div>
  );
}
