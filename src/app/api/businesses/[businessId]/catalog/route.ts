import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalog } from "@/domain/catalog/get-catalog";

const params = z.object({ businessId: z.uuid() });

/**
 * Public catalog for a business (services + professionals).
 * Consumed by the booking UI via React Query. Works from the platform domain
 * and from custom domains, since /api is never rewritten by the proxy.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/businesses/[businessId]/catalog">) {
  const parsed = params.safeParse(await ctx.params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
  }

  const catalog = await getCatalog(parsed.data.businessId);
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" },
  });
}
