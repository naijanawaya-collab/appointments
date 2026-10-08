import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { localDateString, parseLocalDate } from "@/domain/availability/compute-slots";
import { listCategories, listServices } from "@/domain/catalog/admin";
import { listStaff } from "@/domain/team/admin";
import { adminHref } from "@/components/admin/nav";
import { WalkInForm } from "@/components/admin/walk-in-form";
import { Providers } from "@/components/providers";
import { requireShop } from "@/lib/authz";

export const metadata: Metadata = { title: "New booking" };

/** "+ Walk-in": a booking made by the shop (walk-in or phone), any time from now. */
export default async function NewBookingPage({ params, searchParams }: PageProps<"/admin/[shop]/bookings/new">) {
  const ctx = await requireShop((await params).shop);
  const sp = await searchParams;
  const today = localDateString(new Date(), ctx.business.timezone);
  const date = typeof sp.date === "string" && parseLocalDate(sp.date) && sp.date >= today ? sp.date : today;
  const [services, categories, team] = await Promise.all([listServices(ctx.business.id), listCategories(ctx.business.id), listStaff(ctx.business.id)]);

  return (
    <>
      <Link href={adminHref(ctx.business.slug)} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Today
      </Link>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">New booking</h1>
        </div>
      </header>
      <Providers>
        <WalkInForm
          business={{ id: ctx.business.id, slug: ctx.business.slug, timezone: ctx.business.timezone, currency: ctx.business.currency, locale: ctx.business.locale }}
          services={services.filter((s) => s.isActive).map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents, categoryId: s.categoryId, staffIds: s.staffIds }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          team={team.filter((t) => t.isActive).map((t) => ({ id: t.id, name: t.displayName }))}
          initialDate={date}
          today={today}
        />
      </Providers>
    </>
  );
}
