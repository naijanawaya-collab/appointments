/**
 * Domain event handlers. Today they run in-process right after the HTTP
 * response (via Next's `after()`); later the same functions can become
 * queue consumers without changing the code that triggers them.
 *
 * They never throw: a failed email is logged, the booking stays valid.
 */
import { getBookingDetails, type BookingDetails } from "@/domain/booking/get-booking";
import { sendEmail } from "@/lib/email";
import { bookingCancelledEmail, bookingConfirmationEmail, ownerNewBookingEmail } from "./booking-emails";

async function safely(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[notify] ${label} failed`, err);
  }
}

type Audience = { customer?: boolean; owner?: boolean };

/** Bookings the shop makes itself (walk-ins) don't email the shop. */
export async function onBookingCreated(bookingId: string, manageUrl: string, notify: Audience = {}) {
  const { customer = true, owner = true } = notify;
  const details = await getBookingDetails(bookingId);
  if (!details) return;

  await Promise.all([
    customer &&
      details.customer.email &&
      safely("customer confirmation", () =>
        sendEmail({
          to: details.customer.email!,
          replyTo: details.business.email ?? undefined,
          ...bookingConfirmationEmail(details, manageUrl),
        }),
      ),
    owner &&
      details.business.email &&
      safely("owner notification", () =>
        sendEmail({ to: details.business.email!, replyTo: details.customer.email ?? undefined, ...ownerNewBookingEmail(details) }),
      ),
  ]);
}

/** Cancelled by the shop: the customer is told (if the owner chose to), the shop isn't. */
export async function onBookingCancelled(details: BookingDetails, notify: Audience = {}) {
  const { customer = true, owner = true } = notify;
  await Promise.all([
    customer &&
      details.customer.email &&
      safely("customer cancellation", () =>
        sendEmail({
          to: details.customer.email!,
          replyTo: details.business.email ?? undefined,
          ...bookingCancelledEmail(details, "customer"),
        }),
      ),
    owner &&
      details.business.email &&
      safely("owner cancellation", () =>
        sendEmail({ to: details.business.email!, ...bookingCancelledEmail(details, "owner") }),
      ),
  ]);
}
