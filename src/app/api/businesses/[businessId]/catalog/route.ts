import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalog } from "@/domain/catalog/get-catalog";
import { businessForRequest, errorResponse, handleRouteError } from "@/lib/api";

/**
 * GET /api/businesses/:id/catalog – public services + professionals.
 * Consumed by the booking UI via React Query.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/businesses/[businessId]/catalog">) {
  const { businessId } = await ctx.params;
  if (!z.uuid().safeParse(businessId).success) return errorResponse("NOT_FOUND", "Business not found.", 404);

  try {
    const business = await businessForRequest(request, businessId);
    if (!business) return errorResponse("NOT_FOUND", "Business not found.", 404);

    const catalog = await getCatalog(business.id);
    return NextResponse.json(catalog, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
