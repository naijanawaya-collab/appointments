import { CalendarPlus, Check, MessageCircle, Phone, X } from "lucide-react";
import { notFound } from "next/navigation";
import { ShopMark } from "@/components/site/shop-mark";
import { canCustomerCancel, getBookingByToken } from "@/domain/booking/get-booking";
import { clockTime, formatDuration, formatMoney, longDate, shortDate } from "@/lib/format";
import { directionsHref, telHref, waHref } from "@/lib/links";
import { CancelForm } from "./cancel-form";
import "@/styles/booking.css";

type Props = {
  token: string;
  /** Only bookings of this shop are shown (custom domains can't open other shops' links). */
  businessId: string;
  homeHref: string;
  bookHref: string;
  logo?: import("@/domain/media/image").MediaView | null;
  now?: Date;
};

type View = "confirmed" | "cancelled" | "too_late" | "completed" | "missed";

/** Manage booking (SCREENS.md §3, G-1…G-7). Server-rendered; only the cancel panel is client code. */
export async function ManageBooking({ token, businessId, homeHref, bookHref, logo, now = new Date() }: Props) {
  const booking = await getBookingByToken(token);
  if (!booking || booking.business.id !== businessId) notFound(); // G-6

  const b = booking.business;
  const tz = b.timezone;
  const isPast = booking.startsAt.getTime() < now.getTime();
  const view: View =
    booking.status === "cancelled"
      ? "cancelled"
      : booking.status === "no_show"
        ? "missed"
        : booking.status === "completed" || isPast
          ? "completed"
          : canCustomerCancel(booking, now).allowed
            ? "confirmed"
            : "too_late";

  const deadline = new Date(booking.startsAt.getTime() - b.cancellationWindowHours * 3_600_000);
  const pill = {
    confirmed: { cls: "pill-success", icon: <Check size={14} aria-hidden />, label: "Confirmed" },
    too_late: { cls: "pill-success", icon: <Check size={14} aria-hidden />, label: "Confirmed" },
    cancelled: { cls: "pill-danger", icon: <X size={14} aria-hidden />, label: "Cancelled" },
    completed: { cls: "pill-neutral", icon: null, label: "Completed" },
    missed: { cls: "pill-neutral", icon: null, label: "Missed" },
  }[view];
  const calendarHref = `${bookHref.replace(/\/book$/, "")}/b/${token}/calendar.ics`;

  return (
    <div className="mb">
      <header className="bk-header">
        <a href={homeHref} className="bk-brand">
          <ShopMark logo={logo} mark={b.mark} name={b.shortName} size={32} />
          <span className="bk-brand-name display">{b.shortName}</span>
        </a>
      </header>

      <main className="mb-main" id="main">
        <div className="mb-title-row">
          <h1 className="bk-title">Your booking</h1>
          <span className={`pill ${pill.cls}`}>
            {pill.icon}
            {pill.label}
          </span>
        </div>

        <section className="bk-done mb-card" data-cancelled={view === "cancelled"} aria-label="Appointment">
          <div className="px-[22px] pt-6 pb-4">
            <p className="display mb-time m-0">{clockTime(booking.startsAt, tz)}</p>
            <p className="bk-done-date m-0">{longDate(booking.startsAt, tz)}</p>
            <p className="bk-meta m-0 mt-1">Vienna time</p>
          </div>
          <dl className="bk-dl border-t border-line">
            <div>
              <dt>With</dt>
              <dd>{booking.staffName}</dd>
            </div>
            <div>
              <dt>Services</dt>
              <dd>{booking.services.map((s) => s.name).join(", ")}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{formatDuration(booking.durationMin)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd className="font-semibold">{formatMoney(booking.totalPriceCents, b.currency, b.locale)}</dd>
            </div>
            {b.address && (
              <div>
                <dt>Where</dt>
                <dd>{b.address}</dd>
              </div>
            )}
          </dl>
        </section>

        {view === "confirmed" && (
          <>
            <div className="mb-actions">
              <a href={calendarHref} className="btn btn-secondary btn-md" download="booking.ics">
                <CalendarPlus size={16} aria-hidden />
                Add to calendar
              </a>
              {b.address && (
                <a href={directionsHref(b.address)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-md">
                  Directions ↗
                </a>
              )}
            </div>
            <CancelForm token={token} />
            <p className="bk-meta m-0">
              Free online cancellation until {shortDate(deadline, tz)}, {clockTime(deadline, tz)} ({b.cancellationWindowHours} h before).
            </p>
          </>
        )}

        {view === "too_late" && (
          <div className="mb-panel" role="status">
            <strong>Too late to cancel online</strong>
            <span className="text-muted">
              Online cancellation closes {b.cancellationWindowHours} hours before your appointment. Please call the shop, they’ll sort it out.
            </span>
            <div className="mb-actions">
              {b.phone && (
                <a href={telHref(b.phone)} className="btn btn-primary btn-md">
                  <Phone size={16} aria-hidden />
                  Call {b.phone}
                </a>
              )}
              {b.whatsapp && (
                <a href={waHref(b.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-md">
                  <MessageCircle size={16} aria-hidden />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        )}

        {view === "cancelled" && (
          <div className="mb-panel panel-in" role="status">
            <strong>This booking has been cancelled.</strong>
            <span className="text-muted">A confirmation email is on its way. Nothing to pay.</span>
            <a href={bookHref} className="btn btn-primary btn-md self-start">
              Book a new time
            </a>
          </div>
        )}

        {(view === "completed" || view === "missed") && (
          <div className="mb-panel" role="status">
            <span className="text-muted">{view === "completed" ? `Thanks for visiting ${b.shortName}.` : "We missed you this time."}</span>
            <a href={bookHref} className="btn btn-primary btn-md self-start">
              Book again
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
