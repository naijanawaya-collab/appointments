/**
 * Customer self-service cancellation via the emailed manage link.
 * The status update is conditional (WHERE status IN active), so two
 * concurrent cancel clicks can't both "win".
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import { canCustomerCancel, getBookingByToken, type BookingDetails } from "./get-booking";
import { ACTIVE_STATUSES, assertTransition } from "./status";

export async function cancelBookingByToken(
  token: string,
  { now = new Date(), reason }: { now?: Date; reason?: string } = {},
): Promise<BookingDetails> {
  const details = await getBookingByToken(token);
  if (!details) throw new DomainError("BOOKING_NOT_FOUND", "Booking not found.");

  const check = canCustomerCancel(details, now);
  if (!check.allowed) {
    throw check.reason === "too_late"
      ? new DomainError(
          "CANCELLATION_CLOSED",
          `Online cancellation closes ${details.business.cancellationWindowHours} hours before the appointment. Please contact the shop.`,
        )
      : new DomainError("INVALID_STATUS", "This booking can no longer be cancelled.");
  }
  assertTransition(details.status, "cancelled");

  const updated = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: now, cancellationReason: reason?.slice(0, 500) ?? "customer" })
    .where(and(eq(bookings.id, details.id), inArray(bookings.status, [...ACTIVE_STATUSES])))
    .returning({ id: bookings.id });
  if (updated.length === 0) {
    throw new DomainError("INVALID_STATUS", "This booking can no longer be cancelled.");
  }

  return { ...details, status: "cancelled" };
}
