import { getBookingByToken } from "@/domain/booking/get-booking";
import { icsFile } from "@/lib/ics";
import { siteHref } from "@/lib/links";
import { publicBaseUrl } from "@/lib/request";
import { loadSite } from "@/lib/site";

/** GET /<site>/b/<token>/calendar.ics – "Add to calendar" (B-21, G-1). Works without JavaScript. */
export async function GET(request: Request, ctx: RouteContext<"/[site]/b/[token]/calendar.ics">) {
  const { site, token } = await ctx.params;
  const { business, basePath } = await loadSite(site);
  const booking = await getBookingByToken(token);
  if (!booking || booking.business.id !== business.id) return new Response("Not found", { status: 404 });

  const ics = icsFile({
    uid: `${booking.id}@appointments`,
    start: booking.startsAt,
    minutes: booking.durationMin,
    title: `${booking.services.map((s) => s.name).join(", ")} at ${booking.business.shortName}`,
    location: booking.business.address,
    url: `${publicBaseUrl(request)}${siteHref(basePath, `/b/${token}`)}`,
    status: booking.status === "cancelled" ? "CANCELLED" : "CONFIRMED",
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="booking.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
