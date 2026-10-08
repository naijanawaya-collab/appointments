import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import Link from "next/link";
import { moveServiceAction } from "@/app/admin/_actions/catalog";
import { listCategories, listServices } from "@/domain/catalog/admin";
import { CategoryManager } from "@/components/admin/category-manager";
import { ActionButton } from "@/components/admin/form-kit";
import { adminHref } from "@/components/admin/nav";
import { requireShop } from "@/lib/authz";
import { formatDuration, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ params }: PageProps<"/admin/[shop]/services">) {
  const ctx = await requireShop((await params).shop, "owner");
  const [categories, services] = await Promise.all([listCategories(ctx.business.id), listServices(ctx.business.id)]);
  const base = adminHref(ctx.business.slug, "/services");
  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name, items: services.filter((s) => s.categoryId === c.id) })),
    { id: "none", name: categories.length ? "No category" : "Services", items: services.filter((s) => !s.categoryId) },
  ].filter((g) => g.items.length);
  const { currency, locale } = ctx.business;

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Services</h1>
        </div>
        <div className="ad-actions">
          <Link href={`${base}/new`} className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            New service
          </Link>
        </div>
      </header>

      {services.length === 0 ? (
        <p className="ad-empty">No services yet. Add your first one, e.g. “Classic cut · 30 min · € 25”.</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-labelledby={`grp-${g.id}`}>
            <h2 className="ad-group-title" id={`grp-${g.id}`}>
              {g.name}
            </h2>
            <ul className="ad-list">
              {g.items.map((s, i) => (
                <li key={s.id} className="ad-row">
                  <span className="ad-row-main">
                    <Link href={`${base}/${s.id}`} className="ad-row-title">
                      {s.name}
                    </Link>
                    <span className="ad-row-meta">
                      {formatDuration(s.durationMin)}
                      {s.bufferMin ? ` + ${s.bufferMin} min clean-up` : ""} · {formatMoney(s.priceCents, currency, locale)} ·{" "}
                      {s.staffIds.length === 0 ? <strong>nobody assigned</strong> : `${s.staffIds.length} ${s.staffIds.length === 1 ? "professional" : "professionals"}`}
                    </span>
                  </span>
                  <span className="ad-row-side">
                    {!s.isActive && <span className="pill pill-neutral">Hidden</span>}
                    <ActionButton disabled={i === 0} action={moveServiceAction.bind(null, ctx.business.id, s.id, "up")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${s.name} up`}>
                      <ArrowUp size={16} aria-hidden="true" />
                    </ActionButton>
                    <ActionButton disabled={i === g.items.length - 1} action={moveServiceAction.bind(null, ctx.business.id, s.id, "down")} className="btn btn-secondary btn-icon" ariaLabel={`Move ${s.name} down`}>
                      <ArrowDown size={16} aria-hidden="true" />
                    </ActionButton>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <CategoryManager businessId={ctx.business.id} categories={categories.map((c) => ({ id: c.id, name: c.name, count: services.filter((s) => s.categoryId === c.id).length }))} />
    </>
  );
}
