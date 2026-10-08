import { NextResponse } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/domain/availability/get-availability";
import { findNextAvailable } from "@/domain/availability/next-available";
import { addLocalDays } from "@/domain/hours/hours";
import { businessForRequest, errorResponse, handleRouteError } from "@/lib/api";
import { availabilityLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { availabilityQuerySchema } from "@/validation/booking";

/**
 * GET /api/businesses/:id/availability?date=2026-10-06&services=a,b&staff=any
 * Returns bookable start times for one local day.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/businesses/[businessId]/availability">) {
  const limited = availabilityLimiter(`avail:${clientIp(request)}`);
  if (!limited.ok) {
    return errorResponse("RATE_LIMITED", "Too many requests. Please slow down.", 429, {
      "Retry-After": String(limited.retryAfterSec),
    });
  }

  const { businessId } = await ctx.params;
  if (!z.uuid().safeParse(businessId).success) return errorResponse("NOT_FOUND", "Business not found.", 404);

  const query = availabilityQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) {
    return errorResponse("INVALID_QUERY", query.error.issues[0]?.message ?? "Invalid query.", 400);
  }

  try {
    const business = await businessForRequest(request, businessId);
    if (!business) return errorResponse("NOT_FOUND", "Business not found.", 404);

    const result = await getAvailability({
      businessId: business.id,
      date: query.data.date,
      serviceIds: query.data.services,
      staffId: query.data.staff,
    });

    // Empty day → tell the customer when the next free time is (B-12).
    const nextAvailable = result.slots.length
      ? null
      : await findNextAvailable({
          businessId: business.id,
          timezone: business.timezone,
          serviceIds: query.data.services,
          staffId: query.data.staff,
          fromDate: addLocalDays(query.data.date, 1),
          days: 30,
        });

    return NextResponse.json(
      {
        date: query.data.date,
        timezone: result.timezone,
        durationMin: result.serviceDurationMin,
        slots: result.slots,
        nextAvailable,
      },
      // Availability changes with every booking: never cache it.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
