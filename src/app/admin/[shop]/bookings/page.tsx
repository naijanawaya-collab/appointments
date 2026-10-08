import type { Metadata } from "next";
import { Plus } from "lucide-react";
import Link from "next/link";
import { localDateString } from "@/domain/availability/compute-slots";
import { listBookings } from "@/domain/booking/admin";
import { BOOKING_STATUSES, type BookingStatus } from "@/domain/booking/status";
import { listStaff } from "@/domain/team/admin";
import { STATUS_LABEL, STATUS_PILL } from "@/components/admin/booking-row";
import { adminHref } from "@/components/admin/nav";
import { requireShop } from "@/lib/authz";
import { clockTime, formatMoney, longDate } from "@/lib/format";

export const metadata: Metadata = { title: "Bookings" };

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : null);

export default async function BookingsPage({ params, searchParams }: PageProps<"/admin/[shop]/bookings">) {
  const ctx = await requireShop((await params).shop);
  const sp = await searchParams;
  const scope = sp.scope === "past" ? "past" : "upcoming";
  const staffId = str(sp.staff);
  const status = BOOKING_STATUSES.includes(sp.status as BookingStatus) ? (sp.status as BookingStatus) : null;
  const q = str(sp.q);
  const page = Math.max(1, Number(sp.page) || 1);
  const { timezone, currency, locale } = ctx.business;
  const base = adminHref(ctx.business.slug, "/bookings");

  const [{ rows, hasMore }, team] = await Promise.all([
    listBookings(ctx.business.id, { scope, staffId, status, q, page }),
    listStaff(ctx.business.id),
  ]);

  const link = (o: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ scope, staff: staffId, status, q, ...o })) if (v && !(k === "scope" && v === "upcoming") && !(k === "page" && String(v) === "1")) params.set(k, String(v));
    const s = params.toString();
    return s ? `${base}?${s}` : base;
  };

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const day = localDateString(r.startsAt, timezone);
    groups.set(day, [...(groups.get(day) ?? []), r]);
  }

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <h1 className="ad-title">Bookings</h1>
        </div>
        <div className="ad-actions">
          <Link href={`${base}/new`} className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Walk-in or phone booking
          </Link>
        </div>
      </header>

      <nav className="ad-chips" aria-label="When">
        <Link href={link({ scope: "upcoming", page: 1 })} className="ad-chip" aria-current={scope === "upcoming" ? "page" : undefined}>
          Upcoming
        </Link>
        <Link href={link({ scope: "past", page: 1 })} className="ad-chip" aria-current={scope === "past" ? "page" : undefined}>
          Past
        </Link>
      </nav>

      <form className="ad-inline" role="search" action={base}>
        {scope === "past" && <input type="hidden" name="scope" value="past" />}
        <div className="ad-grow">
          <label className="field-label" htmlFor="bk-q">
            Search
          </label>
          <input id="bk-q" name="q" type="search" defaultValue={q ?? ""} placeholder="Name, email or phone" className="field-input is-compact" />
        </div>
        {team.length > 1 && (
          <div>
            <label className="field-label" htmlFor="bk-staff">
              Professional
            </label>
            <select id="bk-staff" name="staff" defaultValue={staffId ?? ""} className="field-input is-compact">
              <option value="">Everyone</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="field-label" htmlFor="bk-status">
            Status
          </label>
          <select id="bk-status" name="status" defaultValue={status ?? ""} className="field-input is-compact">
            <option value="">Any</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="ad-empty">{q || staffId || status ? "No bookings match these filters." : scope === "upcoming" ? "No upcoming bookings." : "No past bookings yet."}</p>
      ) : (
        [...groups.entries()].map(([day, items]) => (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2 className="ad-group-title" id={`day-${day}`}>
              {longDate(items[0].startsAt, timezone)}
            </h2>
            <ul className="ad-list">
              {items.map((b) => (
                <li key={b.id} className="ad-row">
                  <span className="ad-slot-time tabular">{clockTime(b.startsAt, timezone)}</span>
                  <span className="ad-row-main">
                    <Link href={`${base}/${b.id}`} className="ad-row-title">
                      {b.customerName}
                    </Link>
                    <span className="ad-row-meta">
                      {b.serviceNames} · {b.staffName} · {formatMoney(b.totalPriceCents, currency, locale)}
                    </span>
                  </span>
                  <span className={STATUS_PILL[b.status]}>{STATUS_LABEL[b.status]}</span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {(page > 1 || hasMore) && (
        <nav className="ad-pager" aria-label="Pages">
          {page > 1 ? (
            <Link href={link({ page: page - 1 })} className="btn btn-secondary">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={link({ page: page + 1 })} className="btn btn-secondary">
              {scope === "past" ? "Older →" : "Later →"}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
