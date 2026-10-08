import { NextResponse } from "next/server";
import { z } from "zod";
import { findNextAvailable } from "@/domain/availability/next-available";
import { businessForRequest, errorResponse, handleRouteError } from "@/lib/api";
import { availabilityLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

/** GET /api/businesses/:id/next-available → { label: "today 15:30" } or { label: null } */
export async function GET(request: Request, ctx: RouteContext<"/api/businesses/[businessId]/next-available">) {
  if (!availabilityLimiter(`avail:${clientIp(request)}`).ok) {
    return errorResponse("RATE_LIMITED", "Too many requests.", 429);
  }
  const { businessId } = await ctx.params;
  if (!z.uuid().safeParse(businessId).success) return errorResponse("NOT_FOUND", "Business not found.", 404);

  try {
    const business = await businessForRequest(request, businessId);
    if (!business) return errorResponse("NOT_FOUND", "Business not found.", 404);
    const next = await findNextAvailable({ businessId: business.id, timezone: business.timezone });
    return NextResponse.json(
      { label: next?.label ?? null, start: next?.start ?? null },
      // Short shared cache: the label is the same for every visitor for a minute.
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60" } },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
