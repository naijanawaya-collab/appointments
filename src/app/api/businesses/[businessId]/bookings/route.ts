import { after, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/domain/booking/create-booking";
import { onBookingCreated } from "@/domain/notifications/handlers";
import { businessForRequest, errorResponse, handleRouteError } from "@/lib/api";
import { bookingLimiter } from "@/lib/rate-limit";
import { clientIp, isSameOrigin, publicBaseUrl } from "@/lib/request";
import { bookingRequestSchema } from "@/validation/booking";

const MAX_BODY_BYTES = 10_000;

/**
 * POST /api/businesses/:id/bookings – guest booking.
 *
 * Guards: same-origin check (CSRF), per-IP rate limit, body size cap,
 * Zod validation + honeypot, tenant check, then the domain layer re-checks
 * the slot and the database constraint prevents double booking.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/businesses/[businessId]/bookings">) {
  if (!isSameOrigin(request)) return errorResponse("FORBIDDEN", "Cross-site request blocked.", 403);

  const limited = bookingLimiter(`book:${clientIp(request)}`);
  if (!limited.ok) {
    return errorResponse("RATE_LIMITED", "Too many booking attempts. Please try again later.", 429, {
      "Retry-After": String(limited.retryAfterSec),
    });
  }

  const { businessId } = await ctx.params;
  if (!z.uuid().safeParse(businessId).success) return errorResponse("NOT_FOUND", "Business not found.", 404);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return errorResponse("TOO_LARGE", "Request too large.", 413);

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON.", 400);
  }

  const parsed = bookingRequestSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Honeypot filled: pretend success-ish failure without hints.
    if (issue?.path.join(".") === "customer.website") return errorResponse("INVALID_BODY", "Invalid request.", 400);
    return errorResponse("INVALID_BODY", issue?.message ?? "Invalid request.", 400);
  }

  try {
    const business = await businessForRequest(request, businessId);
    if (!business) return errorResponse("NOT_FOUND", "Business not found.", 404);

    const { serviceIds, staffId, startsAt, customer } = parsed.data;
    const result = await createBooking({
      businessId: business.id,
      timezone: business.timezone,
      serviceIds,
      staffId,
      startsAt,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
      customerNote: customer.note,
    });

    const manageUrl = `${publicBaseUrl(request)}/manage/${result.manageToken}`;
    // Emails go out after the response is sent – the customer doesn't wait for them.
    after(() => onBookingCreated(result.bookingId, manageUrl));

    return NextResponse.json(
      { bookingId: result.bookingId, staffId: result.staffId, startsAt: result.startsAt.toISOString(), manageUrl },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
