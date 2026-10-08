import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { addDays, localDateString, parseLocalDate } from "@/domain/availability/compute-slots";
import { dayStats, listBookingsForDay } from "@/domain/booking/admin";
import { listStaff } from "@/domain/team/admin";
import { DaySlot } from "@/components/admin/booking-row";
import { adminHref } from "@/components/admin/nav";
import { requireShop } from "@/lib/authz";
import { clockTime, dayHeading, formatMoney, zoneLabel } from "@/lib/format";
import { publicShopUrl } from "@/lib/shop-url";

export const metadata: Metadata = { title: "Today" };

const firstName = (name: string) => {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${last[0]}.` : first;
};

/** Today (6b): stats, staff filter, the day's appointments. ?date= browses other days. */
export default async function TodayPage({ params, searchParams }: PageProps<"/admin/[shop]">) {
  const ctx = await requireShop((await params).shop);
  const sp = await searchParams;
  const { timezone, currency, locale } = ctx.business;
  const now = new Date();
  const today = localDateString(now, timezone);
  const date = typeof sp.date === "string" && parseLocalDate(sp.date) ? sp.date : today;
  const staffFilter = typeof sp.staff === "string" ? sp.staff : null;
  const isToday = date === today;

  const [rows, team] = await Promise.all([listBookingsForDay(ctx.business.id, date, timezone), listStaff(ctx.business.id)]);
  const statsNow = date < today ? new Date(8.64e15) : now; // a past day has nothing free
  const stats = await dayStats(ctx.business.id, date, rows, statsNow);
  const visible = staffFilter ? rows.filter((r) => r.staffId === staffFilter) : rows;
  const base = adminHref(ctx.business.slug);
  const q = (o: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { date: date === today ? null : date, staff: staffFilter, ...o };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `${base}?${s}` : base;
  };
  const heading = dayHeading(date);
  const bookingPage = await publicShopUrl(ctx.business, "/book");
  const activeTeam = team.filter((t) => t.isActive);

  return (
    <>
      <header className="ad-head">
        <div className="ad-head-text">
          <span className="ad-kicker">
            {heading.weekday} · {zoneLabel(timezone)}
            {!isToday && (
              <>
                {" · "}
                <Link href={q({ date: null })}>Back to today</Link>
              </>
            )}
          </span>
          <h1 className="ad-title">{heading.dayMonth}</h1>
        </div>
        <div className="ad-actions">
          <Link href={q({ date: addDays(date, -1) })} className="btn btn-secondary btn-icon" aria-label="Previous day">
            <ChevronLeft size={18} aria-hidden="true" />
          </Link>
          <Link href={q({ date: addDays(date, 1) })} className="btn btn-secondary btn-icon" aria-label="Next day">
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
          <Link href={`${base}/bookings/new?date=${date}`} className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Walk-in
          </Link>
        </div>
      </header>

      <section className="ad-stats" aria-label="Day at a glance">
        <div className="ad-stat">
          <span className="ad-stat-label">Bookings{isToday ? " today" : ""}</span>
          <span className="ad-stat-value">{stats.bookings}</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">Booked revenue</span>
          <span className="ad-stat-value">{formatMoney(stats.revenueCents, currency, locale)}</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">{isToday ? "Free slots left" : "Free slots"}</span>
          <span className="ad-stat-value">{stats.freeSlots}</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">{isToday ? "Next up" : "First up"}</span>
          <span className="ad-stat-value is-small">
            {(() => {
              const next = isToday ? stats.nextUp : rows.find((r) => r.status !== "cancelled");
              return next ? `${clockTime(next.startsAt, timezone)} · ${firstName(next.customerName)}` : "–";
            })()}
          </span>
        </div>
      </section>

      {activeTeam.length > 1 && (
        <nav className="ad-chips" aria-label="Filter by professional">
          <Link href={q({ staff: null })} className="ad-chip" aria-current={!staffFilter ? "page" : undefined}>
            Everyone
          </Link>
          {activeTeam.map((t) => (
            <Link key={t.id} href={q({ staff: t.id })} className="ad-chip" aria-current={staffFilter === t.id ? "page" : undefined}>
              {t.displayName}
            </Link>
          ))}
        </nav>
      )}

      {visible.length ? (
        <ul className="ad-day" aria-label="Appointments">
          {visible.map((b) => (
            <DaySlot key={b.id} booking={b} timezone={timezone} now={now} href={`${base}/bookings/${b.id}`} />
          ))}
        </ul>
      ) : (
        <div className="ad-empty">
          <p style={{ margin: "0 0 12px" }}>{isToday ? "No bookings yet today." : "No bookings on this day."}</p>
          {activeTeam.length === 0 && ctx.role === "owner" ? (
            <Link href={`${base}/team/new`} className="btn btn-secondary">
              Add your first professional
            </Link>
          ) : (
            <a href={bookingPage} className="btn btn-secondary" target="_blank" rel="noreferrer">
              Open your booking page ↗
            </a>
          )}
        </div>
      )}
    </>
  );
}
