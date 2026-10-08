/**
 * The shop's side of bookings: day view, lists, status changes, walk-ins.
 * Status changes go through `assertTransition` and are conditional updates,
 * so a booking the customer just cancelled can't be "completed" by the shop.
 */
import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { bookingServices, bookings, customers, services, staff } from "@/db/schema";
import { getAvailability } from "@/domain/availability/get-availability";
import { localDayRange } from "@/domain/availability/compute-slots";
import { DomainError } from "@/domain/errors";
import { getBookingDetails, type BookingDetails } from "./get-booking";
import { ACTIVE_STATUSES, assertTransition, canTransition, type BookingStatus } from "./status";

export type AdminBooking = {
  id: string;
  status: BookingStatus;
  source: "online" | "admin" | "walk_in";
  startsAt: Date;
  endsAt: Date;
  totalPriceCents: number;
  staffId: string;
  staffName: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceNames: string;
  customerNote: string | null;
  internalNote: string | null;
  cancellationReason: string | null;
  createdAt: Date;
};

const serviceNames = sql<string>`coalesce((
  select string_agg(${bookingServices.nameSnapshot}, ' + ' order by ${bookingServices.position})
  from ${bookingServices} where ${bookingServices.bookingId} = ${bookings.id}
), '')`;

const COLUMNS = {
  id: bookings.id,
  status: bookings.status,
  source: bookings.source,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  totalPriceCents: bookings.totalPriceCents,
  staffId: bookings.staffId,
  staffName: staff.displayName,
  customerName: customers.name,
  customerEmail: customers.email,
  customerPhone: customers.phone,
  serviceNames,
  customerNote: bookings.customerNote,
  internalNote: bookings.internalNote,
  cancellationReason: bookings.cancellationReason,
  createdAt: bookings.createdAt,
};

const base = () =>
  db
    .select(COLUMNS)
    .from(bookings)
    .innerJoin(staff, eq(staff.id, bookings.staffId))
    .innerJoin(customers, eq(customers.id, bookings.customerId));

/** Every booking on a local day (all statuses), in time order. */
export async function listBookingsForDay(businessId: string, date: string, timezone: string): Promise<AdminBooking[]> {
  const day = localDayRange(date, timezone);
  return base()
    .where(and(eq(bookings.businessId, businessId), gte(bookings.startsAt, day.start), lt(bookings.startsAt, day.end)))
    .orderBy(asc(bookings.startsAt), asc(staff.sortOrder));
}

export const PAGE_SIZE = 30;

export type BookingFilters = {
  scope: "upcoming" | "past";
  staffId?: string | null;
  status?: BookingStatus | null;
  q?: string | null;
  page?: number;
  now?: Date;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listBookings(businessId: string, f: BookingFilters): Promise<{ rows: AdminBooking[]; hasMore: boolean }> {
  const now = f.now ?? new Date();
  const page = Math.max(1, f.page ?? 1);
  const where: (SQL | undefined)[] = [
    eq(bookings.businessId, businessId),
    // Upcoming = hasn't ended yet; past = ended.
    f.scope === "upcoming" ? gte(bookings.endsAt, now) : lt(bookings.endsAt, now),
    f.staffId ? eq(bookings.staffId, f.staffId) : undefined,
    f.status ? eq(bookings.status, f.status) : undefined,
  ];
  const q = f.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    where.push(or(ilike(customers.name, like), ilike(customers.email, like), ilike(customers.phone, like)));
  }
  const rows = await base()
    .where(and(...where))
    .orderBy(f.scope === "upcoming" ? asc(bookings.startsAt) : desc(bookings.startsAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getAdminBooking(businessId: string, bookingId: string): Promise<AdminBooking> {
  const [row] = await base().where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId)));
  if (!row) throw new DomainError("NOT_FOUND", "Booking not found.");
  return row;
}

/** What the shop may do with a booking right now (drives the drawer buttons). */
export function shopActions(b: Pick<AdminBooking, "status" | "startsAt">, now = new Date()) {
  const started = b.startsAt.getTime() <= now.getTime();
  return {
    cancel: canTransition(b.status, "cancelled"),
    complete: started && canTransition(b.status, "completed"),
    noShow: started && canTransition(b.status, "no_show"),
  };
}

/**
 * The shop cancels (any time, no deadline). Returns the details so the
 * caller can email the customer.
 */
export async function cancelBookingByShop(
  businessId: string,
  bookingId: string,
  { reason, now = new Date() }: { reason?: string | null; now?: Date } = {},
): Promise<BookingDetails> {
  const current = await getAdminBooking(businessId, bookingId);
  if (!canTransition(current.status, "cancelled")) throw new DomainError("INVALID_STATUS", "This booking can't be cancelled any more.");
  assertTransition(current.status, "cancelled");
  const updated = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: now, cancellationReason: reason?.slice(0, 200) || "Cancelled by the shop" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId), inArray(bookings.status, [...ACTIVE_STATUSES])))
    .returning({ id: bookings.id });
  if (!updated.length) throw new DomainError("INVALID_STATUS", "This booking can't be cancelled any more.");
  const details = await getBookingDetails(bookingId);
  return details!;
}

/** Completed / no-show, once the appointment has started. */
export async function setBookingOutcome(businessId: string, bookingId: string, to: "completed" | "no_show", now = new Date()) {
  const current = await getAdminBooking(businessId, bookingId);
  const allowed = shopActions(current, now);
  if (!(to === "completed" ? allowed.complete : allowed.noShow)) {
    throw new DomainError(
      "INVALID_STATUS",
      current.startsAt > now ? "You can mark this once the appointment has started." : "This booking can't be changed any more.",
    );
  }
  assertTransition(current.status, to);
  const updated = await db
    .update(bookings)
    .set({ status: to })
    .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId), eq(bookings.status, current.status)))
    .returning({ id: bookings.id });
  if (!updated.length) throw new DomainError("INVALID_STATUS", "This booking changed in the meantime. Refresh and try again.");
}

export async function setInternalNote(businessId: string, bookingId: string, note: string | null) {
  const rows = await db
    .update(bookings)
    .set({ internalNote: note })
    .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId)))
    .returning({ id: bookings.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Booking not found.");
}

// ── dashboard ────────────────────────────────────────────────────────────────

export type DayStats = {
  bookings: number;
  revenueCents: number;
  freeSlots: number;
  nextUp: AdminBooking | null;
};

const COUNTED: readonly BookingStatus[] = ["pending", "confirmed", "completed"];

/**
 * Today's numbers. "Free slots left" counts start times from now on where at
 * least one professional could still take the shop's shortest service.
 */
export async function dayStats(
  businessId: string,
  date: string,
  rows: AdminBooking[],
  now = new Date(),
): Promise<DayStats> {
  const counted = rows.filter((r) => COUNTED.includes(r.status));
  const nextUp = rows.find((r) => ACTIVE_STATUSES.includes(r.status) && r.startsAt >= now) ?? null;

  const [shortest] = await db
    .select({ id: services.id })
    .from(services)
    .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
    .orderBy(asc(services.durationMin))
    .limit(1);
  let freeSlots = 0;
  if (shortest) {
    try {
      const availability = await getAvailability({ businessId, date, serviceIds: [shortest.id], staffId: "any", now, ignoreLeadTime: true });
      freeSlots = availability.slots.length;
    } catch {
      freeSlots = 0; // no bookable staff for that service etc.
    }
  }

  return {
    bookings: counted.length,
    revenueCents: counted.reduce((sum, r) => sum + r.totalPriceCents, 0),
    freeSlots,
    nextUp,
  };
}
