import { notFound } from "next/navigation";
import { canCustomerCancel, getBookingByToken } from "@/domain/booking/get-booking";
import { formatDuration, formatMoney, UI_LOCALE } from "@/lib/format";
import { CancelForm } from "./cancel-form";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "Missed",
} as const;

/**
 * "Manage my booking" view, used by /manage/[token] (platform) and
 * /sites/[host]/manage/[token] (custom domain). `businessId` restricts a
 * custom domain to its own bookings.
 */
export async function ManageBooking({
  token,
  businessId,
  bookHref,
}: {
  token: string;
  businessId?: string;
  /** Where "book again" links to: "/" on a custom domain, /book/[slug] on the platform. */
  bookHref?: string;
}) {
  const booking = await getBookingByToken(token);
  if (!booking || (businessId && booking.business.id !== businessId)) notFound();

  const { business } = booking;
  const when = new Intl.DateTimeFormat(UI_LOCALE, {
    timeZone: business.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(booking.startsAt);
  const cancel = canCustomerCancel(booking);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-14">
      <p className="text-sm uppercase tracking-widest text-muted">{business.name}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your booking</h1>

      <div className="mt-6 rounded-xl border border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xl font-semibold">{when}</p>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs">{STATUS_LABEL[booking.status]}</span>
        </div>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">With</dt>
            <dd>{booking.staffName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Services</dt>
            <dd className="text-right">{booking.services.map((s) => s.name).join(", ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Duration</dt>
            <dd>{formatDuration(booking.durationMin)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Price</dt>
            <dd>{formatMoney(booking.totalPriceCents, business.currency, business.locale)}</dd>
          </div>
          {business.address && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Where</dt>
              <dd className="text-right">{business.address}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6">
        {booking.status === "cancelled" ? (
          <p role="status" className="rounded-lg border border-line bg-surface p-4 text-sm">
            This booking has been cancelled.{" "}
            <a href={bookHref ?? `/book/${business.slug}`} className="underline">
              Book a new time
            </a>
          </p>
        ) : cancel.allowed ? (
          <CancelForm token={token} />
        ) : cancel.reason === "too_late" ? (
          <p className="text-sm text-muted">
            Online cancellation closes {business.cancellationWindowHours} hours before your appointment.
            {business.phone ? ` Please call ${business.phone}.` : " Please contact the shop."}
          </p>
        ) : null}
      </div>
    </main>
  );
}
