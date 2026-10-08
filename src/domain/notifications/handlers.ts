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

export async function onBookingCreated(bookingId: string, manageUrl: string) {
  const details = await getBookingDetails(bookingId);
  if (!details) return;

  await Promise.all([
    details.customer.email &&
      safely("customer confirmation", () =>
        sendEmail({
          to: details.customer.email!,
          replyTo: details.business.email ?? undefined,
          ...bookingConfirmationEmail(details, manageUrl),
        }),
      ),
    details.business.email &&
      safely("owner notification", () =>
        sendEmail({ to: details.business.email!, replyTo: details.customer.email ?? undefined, ...ownerNewBookingEmail(details) }),
      ),
  ]);
}

export async function onBookingCancelled(details: BookingDetails) {
  await Promise.all([
    details.customer.email &&
      safely("customer cancellation", () =>
        sendEmail({
          to: details.customer.email!,
          replyTo: details.business.email ?? undefined,
          ...bookingCancelledEmail(details, "customer"),
        }),
      ),
    details.business.email &&
      safely("owner cancellation", () =>
        sendEmail({ to: details.business.email!, ...bookingCancelledEmail(details, "owner") }),
      ),
  ]);
}
