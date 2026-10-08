/** Shop opening hours and whole-day closures. */
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { closures, openingHours } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import type { HoursRange } from "./edit";

export async function getOpeningHours(businessId: string): Promise<HoursRange[]> {
  const rows = await db
    .select({ weekday: openingHours.weekday, startTime: openingHours.startTime, endTime: openingHours.endTime })
    .from(openingHours)
    .where(eq(openingHours.businessId, businessId))
    .orderBy(asc(openingHours.weekday), asc(openingHours.startTime));
  return rows.map((r) => ({ weekday: r.weekday, startTime: r.startTime.slice(0, 5), endTime: r.endTime.slice(0, 5) }));
}

/** Replaces the whole week (input validated by `hoursSchema`). */
export async function setOpeningHours(businessId: string, ranges: HoursRange[]) {
  await db.transaction(async (tx) => {
    await tx.delete(openingHours).where(eq(openingHours.businessId, businessId));
    if (ranges.length) await tx.insert(openingHours).values(ranges.map((r) => ({ ...r, businessId })));
  });
}

/** Upcoming and current closures (past ones are history, not shown). */
export async function listClosures(businessId: string, today: string) {
  return db
    .select()
    .from(closures)
    .where(and(eq(closures.businessId, businessId), gte(closures.endsOn, today)))
    .orderBy(asc(closures.startsOn));
}

export async function addClosure(businessId: string, input: { startsOn: string; endsOn: string; label: string | null }) {
  const [row] = await db.insert(closures).values({ businessId, ...input }).returning();
  return row;
}

export async function removeClosure(businessId: string, closureId: string) {
  const rows = await db
    .delete(closures)
    .where(and(eq(closures.id, closureId), eq(closures.businessId, businessId)))
    .returning({ id: closures.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Closure not found.");
}
