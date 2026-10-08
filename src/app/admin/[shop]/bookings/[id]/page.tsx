import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAdminBooking, shopActions } from "@/domain/booking/admin";
import { isDomainError } from "@/domain/errors";
import { BookingActions, InternalNoteForm } from "@/components/admin/booking-actions";
import { STATUS_LABEL, STATUS_PILL } from "@/components/admin/booking-row";
import { adminHref } from "@/components/admin/nav";
import { requireShop } from "@/lib/authz";
import { clockTime, formatDuration, formatMoney, longDate } from "@/lib/format";
import { mailHref, telHref } from "@/lib/links";

export const metadata: Metadata = { title: "Booking" };

const SOURCE: Record<string, string> = { online: "Online", admin: "Phone (added by the shop)", walk_in: "Walk-in" };

export default async function BookingPage({ params }: PageProps<"/admin/[shop]/bookings/[id]">) {
  const { shop, id } = await params;
  const ctx = await requireShop(shop);
  if (!z.uuid().safeParse(id).success) notFound();
  const booking = await getAdminBooking(ctx.business.id, id).catch((err) => {
    if (isDomainError(err) && err.code === "NOT_FOUND") notFound();
    throw err;
  });
  const { timezone, currency, locale } = ctx.business;
  const actions = shopActions(booking);
  const minutes = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);

  return (
    <>
      <Link href={adminHref(ctx.business.slug, "/bookings")} className="ad-back">
        <ArrowLeft size={16} aria-hidden="true" />
        Bookings
      </Link>
      <header className="ad-head">
        <div className="ad-head-text">
          <span className="ad-kicker">{longDate(booking.startsAt, timezone)}</span>
          <h1 className="ad-title">
            {clockTime(booking.startsAt, timezone)} · {booking.customerName}
          </h1>
        </div>
        <span className={STATUS_PILL[booking.status]}>{STATUS_LABEL[booking.status]}</span>
      </header>

      <section className="ad-card">
        <dl className="ad-dl">
          <div>
            <dt>Services</dt>
            <dd>{booking.serviceNames}</dd>
          </div>
          <div>
            <dt>With</dt>
            <dd>{booking.staffName}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd className="tabular">
              {clockTime(booking.startsAt, timezone)}–{clockTime(booking.endsAt, timezone)} ({formatDuration(minutes)} incl. clean-up)
            </dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>
              <strong>{formatMoney(booking.totalPriceCents, currency, locale)}</strong>
            </dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{booking.customerName}</dd>
          </div>
          {booking.customerEmail && (
            <div>
              <dt>Email</dt>
              <dd>
                <a href={mailHref(booking.customerEmail)}>{booking.customerEmail}</a>
              </dd>
            </div>
          )}
          {booking.customerPhone && (
            <div>
              <dt>Phone</dt>
              <dd>
                <a href={telHref(booking.customerPhone)}>{booking.customerPhone}</a>
              </dd>
            </div>
          )}
          {booking.customerNote && (
            <div>
              <dt>Their note</dt>
              <dd>{booking.customerNote}</dd>
            </div>
          )}
          <div>
            <dt>Booked</dt>
            <dd>
              {SOURCE[booking.source]} · {longDate(booking.createdAt, timezone)}
            </dd>
          </div>
          {booking.status === "cancelled" && booking.cancellationReason && (
            <div>
              <dt>Cancelled</dt>
              <dd>{booking.cancellationReason === "customer" ? "By the customer" : booking.cancellationReason}</dd>
            </div>
          )}
        </dl>
      </section>

      {(actions.cancel || actions.complete || actions.noShow) && (
        <BookingActions businessId={ctx.business.id} bookingId={booking.id} actions={actions} hasEmail={Boolean(booking.customerEmail)} />
      )}

      <section className="ad-card">
        <h2>Internal note</h2>
        <p className="ad-card-intro">Only the shop sees this.</p>
        <InternalNoteForm businessId={ctx.business.id} bookingId={booking.id} note={booking.internalNote ?? ""} />
      </section>
    </>
  );
}
