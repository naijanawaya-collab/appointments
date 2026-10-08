/**
 * "Next free time" lookups: the storefront's mobile book bar ("Next free:
 * today 15:30") and the booking flow's empty-day state ("The next free time
 * is Tue 13 Oct at 09:30").
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { UI_LOCALE } from "@/lib/format";
import { daysBetween, localDateString } from "./compute-slots";
import { getAvailability } from "./get-availability";

export type NextAvailable = { date: string; time: string; start: string; label: string };

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "today 15:30", "tomorrow 09:00", "Tue 13 Oct 09:30". */
export function nextAvailableLabel(start: string, timezone: string, now: Date): string {
  const instant = new Date(start);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
  const offset = daysBetween(localDateString(now, timezone), localDateString(instant, timezone));
  if (offset === 0) return `today ${time}`;
  if (offset === 1) return `tomorrow ${time}`;
  const day = new Intl.DateTimeFormat(UI_LOCALE, { timeZone: timezone, weekday: "short", day: "numeric", month: "short" }).format(instant);
  return `${day} ${time}`;
}

/**
 * First bookable start from `fromDate` (inclusive) over `days` days.
 * Without services, uses the shop's shortest active service (a fair "any
 * appointment" answer for the book bar).
 */
export async function findNextAvailable(opts: {
  businessId: string;
  timezone: string;
  serviceIds?: string[];
  staffId?: string | "any";
  fromDate?: string;
  days?: number;
  now?: Date;
}): Promise<NextAvailable | null> {
  const now = opts.now ?? new Date();
  let serviceIds = opts.serviceIds;
  if (!serviceIds?.length) {
    const [shortest] = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.businessId, opts.businessId), eq(services.isActive, true)))
      .orderBy(asc(services.durationMin))
      .limit(1);
    if (!shortest) return null;
    serviceIds = [shortest.id];
  }

  const start = opts.fromDate ?? localDateString(now, opts.timezone);
  for (let i = 0; i < (opts.days ?? 14); i++) {
    const date = addDays(start, i);
    const { slots } = await getAvailability({
      businessId: opts.businessId,
      date,
      serviceIds,
      staffId: opts.staffId ?? "any",
      now,
    });
    if (slots.length) {
      const first = slots[0].start;
      const time = new Intl.DateTimeFormat("en-GB", { timeZone: opts.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(first));
      return { date, time, start: first, label: nextAvailableLabel(first, opts.timezone, now) };
    }
  }
  return null;
}
