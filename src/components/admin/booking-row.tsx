import Link from "next/link";
import type { AdminBooking } from "@/domain/booking/admin";
import { clockTime } from "@/lib/format";

const STATUS_FLAG: Record<AdminBooking["status"], string | null> = {
  pending: null,
  confirmed: null,
  completed: "✓ Done",
  no_show: "No-show",
  cancelled: "Cancelled",
};

/** One appointment in the day list (mobile list design in admin-dashboard.jpg). */
export function DaySlot({ booking, href, timezone, now }: { booking: AdminBooking; href: string; timezone: string; now: Date }) {
  const isNow = booking.startsAt <= now && booking.endsAt > now && (booking.status === "confirmed" || booking.status === "pending");
  const cls = ["ad-slot", isNow && "is-now", booking.status === "completed" && "is-done", (booking.status === "cancelled" || booking.status === "no_show") && "is-off"]
    .filter(Boolean)
    .join(" ");
  const flag = isNow ? "Now" : STATUS_FLAG[booking.status];
  return (
    <li>
      <Link href={href} className={cls}>
        <span className="ad-slot-time">{clockTime(booking.startsAt, timezone)}</span>
        <span className="ad-slot-body">
          <strong>{booking.customerName}</strong>
          <span>
            {booking.serviceNames} · {booking.staffName}
            {booking.source === "walk_in" ? " · walk-in" : ""}
          </span>
        </span>
        {flag && <span className="ad-slot-flag">{flag}</span>}
      </Link>
    </li>
  );
}

export const STATUS_LABEL: Record<AdminBooking["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export const STATUS_PILL: Record<AdminBooking["status"], string> = {
  pending: "pill pill-neutral",
  confirmed: "pill pill-success",
  completed: "pill pill-neutral",
  no_show: "pill pill-danger",
  cancelled: "pill pill-danger",
};
