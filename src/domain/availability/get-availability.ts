/**
 * Loads everything computeSlots() needs from the database for one business,
 * one local date, a set of services and an optional professional.
 *
 * Tenant safety: services and staff are always filtered by businessId, so a
 * caller can never mix another shop's services or barbers into a request.
 */
import { and, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  closures,
  bookings,
  businesses,
  services,
  staff,
  staffServices,
  timeOff,
  workingHours,
} from "@/db/schema";
import { ACTIVE_STATUSES } from "@/domain/booking/status";
import { DomainError } from "@/domain/errors";
import {
  computeSlots,
  isoWeekday,
  localDayRange,
  parseLocalDate,
  type Slot,
  type StaffAvailability,
} from "./compute-slots";

export type AvailabilityQuery = {
  businessId: string;
  /** "YYYY-MM-DD" in the business timezone */
  date: string;
  serviceIds: string[];
  /** A specific professional, or "any" */
  staffId: string | "any";
  now?: Date;
  /** Shop staff booking a walk-in or phone call: the online lead time doesn't apply. */
  ignoreLeadTime?: boolean;
};

export type SelectedService = typeof services.$inferSelect;

export type AvailabilityResult = {
  slots: Slot[];
  services: SelectedService[];
  serviceDurationMin: number;
  blockDurationMin: number;
  timezone: string;
};

/** Validates the service selection for a business and returns the services in the requested order. */
export async function loadSelectedServices(businessId: string, serviceIds: string[]) {
  const unique = [...new Set(serviceIds)];
  if (unique.length === 0) throw new DomainError("INVALID_SELECTION", "Choose at least one service.");

  const rows = await db
    .select()
    .from(services)
    .where(
      and(eq(services.businessId, businessId), eq(services.isActive, true), inArray(services.id, unique)),
    );
  if (rows.length !== unique.length) {
    throw new DomainError("INVALID_SELECTION", "One or more services are not available.");
  }
  return unique.map((id) => rows.find((r) => r.id === id)!);
}

/** Active staff of the business who can perform every one of the given services. */
export async function loadEligibleStaff(businessId: string, serviceIds: string[], staffId: string | "any") {
  const rows = await db
    .select({ id: staff.id, sortOrder: staff.sortOrder, displayName: staff.displayName, serviceId: staffServices.serviceId })
    .from(staff)
    .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
    .where(
      and(
        eq(staff.businessId, businessId),
        eq(staff.isActive, true),
        inArray(staffServices.serviceId, serviceIds),
        staffId === "any" ? undefined : eq(staff.id, staffId),
      ),
    );

  const counts = new Map<string, { id: string; sortOrder: number; displayName: string; n: number }>();
  for (const r of rows) {
    const entry = counts.get(r.id) ?? { id: r.id, sortOrder: r.sortOrder, displayName: r.displayName, n: 0 };
    entry.n += 1;
    counts.set(r.id, entry);
  }
  const needed = new Set(serviceIds).size;
  return [...counts.values()]
    .filter((s) => s.n === needed)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName))
    .map(({ id, displayName }) => ({ id, displayName }));
}

export async function getAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
  const now = query.now ?? new Date();
  if (!parseLocalDate(query.date)) throw new DomainError("INVALID_SELECTION", "Invalid date.");

  const [business] = await db
    .select()
    .from(businesses)
    .where(and(eq(businesses.id, query.businessId), eq(businesses.isActive, true)));
  if (!business) throw new DomainError("INVALID_SELECTION", "Business not found.");

  const selected = await loadSelectedServices(business.id, query.serviceIds);
  const serviceDurationMin = selected.reduce((sum, s) => sum + s.durationMin, 0);
  const blockDurationMin = serviceDurationMin + selected.reduce((sum, s) => sum + s.bufferMin, 0);

  const eligible = await loadEligibleStaff(
    business.id,
    selected.map((s) => s.id),
    query.staffId,
  );

  const empty: AvailabilityResult = {
    slots: [],
    services: selected,
    serviceDurationMin,
    blockDurationMin,
    timezone: business.timezone,
  };
  if (eligible.length === 0) return empty;

  // Whole-day shop closures (holidays) block every professional.
  const [closed] = await db
    .select({ id: closures.id })
    .from(closures)
    .where(and(eq(closures.businessId, business.id), lte(closures.startsOn, query.date), gte(closures.endsOn, query.date)))
    .limit(1);
  if (closed) return empty;

  const staffIds = eligible.map((s) => s.id);
  const day = localDayRange(query.date, business.timezone);
  // Widen the busy window so long bookings from the previous evening still count.
  const from = new Date(day.start.getTime() - 24 * 3_600_000);
  const to = new Date(day.end.getTime() + 24 * 3_600_000);

  const [hours, existing, off] = await Promise.all([
    db
      .select()
      .from(workingHours)
      .where(and(inArray(workingHours.staffId, staffIds), eq(workingHours.weekday, isoWeekday(query.date)))),
    db
      .select({ staffId: bookings.staffId, start: bookings.startsAt, end: bookings.endsAt })
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, business.id),
          inArray(bookings.staffId, staffIds),
          inArray(bookings.status, [...ACTIVE_STATUSES]),
          lt(bookings.startsAt, to),
          gt(bookings.endsAt, from),
        ),
      ),
    db
      .select({ staffId: timeOff.staffId, start: timeOff.startsAt, end: timeOff.endsAt })
      .from(timeOff)
      .where(and(inArray(timeOff.staffId, staffIds), lt(timeOff.startsAt, to), gt(timeOff.endsAt, from))),
  ]);

  const staffAvailability: StaffAvailability[] = staffIds.map((id) => ({
    staffId: id,
    windows: hours
      .filter((h) => h.staffId === id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((h) => ({ start: h.startTime, end: h.endTime })),
    busy: [...existing, ...off].filter((b) => b.staffId === id).map(({ start, end }) => ({ start, end })),
  }));

  return {
    ...empty,
    slots: computeSlots({
      date: query.date,
      timezone: business.timezone,
      now,
      slotIntervalMin: business.slotIntervalMin,
      minLeadTimeMin: query.ignoreLeadTime ? 0 : business.minLeadTimeMin,
      maxAdvanceDays: business.maxAdvanceDays,
      serviceDurationMin,
      blockDurationMin,
      staff: staffAvailability,
    }),
  };
}
