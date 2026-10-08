import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { closures, openingHours } from "@/db/schema";
import { localDateString } from "@/domain/availability/compute-slots";
import { addLocalDays, closedDates } from "@/domain/hours/hours";
import { businessForRequest, errorResponse, handleRouteError } from "@/lib/api";
import { availabilityLimiter } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const query = z.object({
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(62).default(61),
});

/**
 * GET /api/businesses/:id/days?from=YYYY-MM-DD&days=61
 * → { days: [{ date, closed }] } for the booking date strip (B-10).
 * Closed = no opening hours that weekday, or a holiday closure.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/businesses/[businessId]/days">) {
  if (!availabilityLimiter(`avail:${clientIp(request)}`).ok) return errorResponse("RATE_LIMITED", "Too many requests.", 429);
  const { businessId } = await ctx.params;
  if (!z.uuid().safeParse(businessId).success) return errorResponse("NOT_FOUND", "Business not found.", 404);
  const q = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!q.success) return errorResponse("INVALID_QUERY", q.error.issues[0]?.message ?? "Invalid query.", 400);

  try {
    const business = await businessForRequest(request, businessId);
    if (!business) return errorResponse("NOT_FOUND", "Business not found.", 404);

    const from = q.data.from ?? localDateString(new Date(), business.timezone);
    const [hours, closureRows] = await Promise.all([
      db.select().from(openingHours).where(eq(openingHours.businessId, business.id)),
      db.select().from(closures).where(eq(closures.businessId, business.id)),
    ]);
    const closed = closedDates(from, q.data.days, hours, closureRows);
    const days = Array.from({ length: q.data.days }, (_, i) => {
      const date = addLocalDays(from, i);
      return { date, closed: closed.has(date) };
    });
    return NextResponse.json({ days }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=300" } });
  } catch (err) {
    return handleRouteError(err);
  }
}
