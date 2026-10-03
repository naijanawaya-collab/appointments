/**
 * Read model for a single booking: what confirmation emails and the
 * "manage booking" page show.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingServices, bookings, businesses, customers, staff } from "@/db/schema";
import { ACTIVE_STATUSES, type BookingStatus } from "./status";
import { hashManageToken, isPlausibleToken } from "./tokens";

export type BookingDetails = {
  id: string;
  status: BookingStatus;
  startsAt: Date;
  /** Customer-facing duration (services only, no buffers). */
  durationMin: number;
  totalPriceCents: number;
  customerNote: string | null;
  staffName: string;
  customer: { name: string; email: string | null; phone: string | null };
  services: { name: string; durationMin: number; priceCents: number }[];
  business: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    locale: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    cancellationWindowHours: number;
  };
};

async function load(where: ReturnType<typeof eq>): Promise<BookingDetails | null> {
  const [row] = await db
    .select({ booking: bookings, business: businesses, staff, customer: customers })
    .from(bookings)
    .innerJoin(businesses, eq(businesses.id, bookings.businessId))
    .innerJoin(staff, eq(staff.id, bookings.staffId))
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .where(where)
    .limit(1);
  if (!row) return null;

  const items = await db
    .select()
    .from(bookingServices)
    .where(eq(bookingServices.bookingId, row.booking.id))
    .orderBy(asc(bookingServices.position));

  const { booking, business } = row;
  return {
    id: booking.id,
    status: booking.status,
    startsAt: booking.startsAt,
    durationMin: items.reduce((sum, i) => sum + i.durationMin, 0),
    totalPriceCents: booking.totalPriceCents,
    customerNote: booking.customerNote,
    staffName: row.staff.displayName,
    customer: { name: row.customer.name, email: row.customer.email, phone: row.customer.phone },
    services: items.map((i) => ({ name: i.nameSnapshot, durationMin: i.durationMin, priceCents: i.priceCents })),
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      timezone: business.timezone,
      currency: business.currency,
      locale: business.locale,
      email: business.email,
      phone: business.phone,
      address: business.address,
      cancellationWindowHours: business.cancellationWindowHours,
    },
  };
}

export const getBookingDetails = (bookingId: string) => load(eq(bookings.id, bookingId));

export async function getBookingByToken(token: string): Promise<BookingDetails | null> {
  if (!isPlausibleToken(token)) return null;
  return load(eq(bookings.manageTokenHash, hashManageToken(token)));
}

export type CancelCheck = { allowed: true } | { allowed: false; reason: "inactive" | "too_late" };

/** Customers may cancel active bookings until `cancellationWindowHours` before the start. */
export function canCustomerCancel(details: Pick<BookingDetails, "status" | "startsAt" | "business">, now = new Date()): CancelCheck {
  if (!ACTIVE_STATUSES.includes(details.status)) return { allowed: false, reason: "inactive" };
  const deadline = details.startsAt.getTime() - details.business.cancellationWindowHours * 3_600_000;
  if (now.getTime() > deadline) return { allowed: false, reason: "too_late" };
  return { allowed: true };
}
