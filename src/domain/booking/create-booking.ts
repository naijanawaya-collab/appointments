/**
 * Creating a booking.
 *
 * Safety layers, in order:
 *  1. The request is validated with Zod at the HTTP edge.
 *  2. The requested start time must be a slot that getAvailability() actually
 *     offers right now (working hours, lead time, horizon, staff skills,
 *     tenant ownership of services and staff).
 *  3. The insert itself is protected by the database exclusion constraint,
 *     which is the final word when two customers race for the same slot.
 *     For "any professional" we fall through to the next free barber.
 */
import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookingServices, bookings, customers } from "@/db/schema";
import { getAvailability } from "@/domain/availability/get-availability";
import { localDateString, localDayRange } from "@/domain/availability/compute-slots";
import { DomainError, PG_EXCLUSION_VIOLATION, pgErrorCode } from "@/domain/errors";
import { ACTIVE_STATUSES } from "./status";
import { manageTokenFor } from "./tokens";

export type CreateBookingInput = {
  businessId: string;
  timezone: string;
  serviceIds: string[];
  staffId: string | "any";
  /** ISO instant of the chosen slot */
  startsAt: string;
  customer: { name: string; email: string; phone?: string | null };
  customerNote?: string | null;
  source?: "online" | "admin" | "walk_in";
  /** Client-generated key; a retried request with the same key returns the same booking (B-18). */
  idempotencyKey?: string;
  now?: Date;
};

export type CreateBookingResult = {
  bookingId: string;
  staffId: string;
  startsAt: Date;
  /** Raw token – only ever returned here and put into the customer's link. */
  manageToken: string;
  /** True when this was a retry of an earlier identical request. */
  replayed?: boolean;
};

const PG_UNIQUE_VIOLATION = "23505";

async function findByIdempotencyKey(businessId: string, key: string): Promise<CreateBookingResult | null> {
  const [row] = await db
    .select({ id: bookings.id, staffId: bookings.staffId, startsAt: bookings.startsAt })
    .from(bookings)
    .where(and(eq(bookings.businessId, businessId), eq(bookings.idempotencyKey, key)));
  return row ? { bookingId: row.id, staffId: row.staffId, startsAt: row.startsAt, manageToken: manageTokenFor(row.id).token, replayed: true } : null;
}

/**
 * "Any professional": the server picks whoever has the fewest active bookings
 * that day (BEHAVIOUR §3), keeping the shop's staff order as the tiebreaker.
 */
async function leastBookedFirst(businessId: string, staffIds: string[], day: { start: Date; end: Date }): Promise<string[]> {
  if (staffIds.length < 2) return staffIds;
  const counts = await db
    .select({ staffId: bookings.staffId, n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        inArray(bookings.staffId, staffIds),
        inArray(bookings.status, [...ACTIVE_STATUSES]),
        gte(bookings.startsAt, day.start),
        lt(bookings.startsAt, day.end),
      ),
    )
    .groupBy(bookings.staffId);
  const byId = new Map(counts.map((c) => [c.staffId, c.n]));
  return [...staffIds].sort((a, b) => (byId.get(a) ?? 0) - (byId.get(b) ?? 0));
}

class SlotTaken extends Error {}

export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
  const now = input.now ?? new Date();
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(input.businessId, input.idempotencyKey);
    if (existing) return existing;
  }
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new DomainError("INVALID_SELECTION", "Invalid time.");

  // Ask the availability engine for that local day and find the exact slot.
  const availability = await getAvailability({
    businessId: input.businessId,
    date: localDateString(startsAt, input.timezone),
    serviceIds: input.serviceIds,
    staffId: input.staffId,
    now,
  });
  const slot = availability.slots.find((s) => s.start === startsAt.toISOString());
  if (!slot) {
    throw new DomainError("SLOT_UNAVAILABLE", "That time is no longer available. Please pick another.");
  }

  const endsAt = new Date(startsAt.getTime() + availability.blockDurationMin * 60_000);
  const totalPriceCents = availability.services.reduce((sum, s) => sum + s.priceCents, 0);
  const email = input.customer.email.trim().toLowerCase();
  const candidates =
    input.staffId === "any"
      ? await leastBookedFirst(input.businessId, slot.staffIds, localDayRange(localDateString(startsAt, input.timezone), input.timezone))
      : slot.staffIds;

  try {
    return await db.transaction(async (tx) => {
      // Customers are per business; the same email books again -> same customer.
      const [customer] = await tx
        .insert(customers)
        .values({
          businessId: input.businessId,
          name: input.customer.name.trim(),
          email,
          phone: input.customer.phone?.trim() || null,
        })
        .onConflictDoUpdate({
          target: [customers.businessId, customers.email],
          set: {
            name: sql`excluded.name`,
            phone: sql`coalesce(excluded.phone, ${customers.phone})`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: customers.id });

      for (const staffId of candidates) {
        const id = randomUUID();
        const { token, hash } = manageTokenFor(id);
        try {
          // Savepoint per attempt: a constraint violation only rolls back this attempt.
          const booking = await tx.transaction(async (sp) => {
            const [created] = await sp
              .insert(bookings)
              .values({
                id,
                businessId: input.businessId,
                staffId,
                customerId: customer.id,
                startsAt,
                endsAt,
                status: "confirmed",
                source: input.source ?? "online",
                totalPriceCents,
                customerNote: input.customerNote?.trim() || null,
                manageTokenHash: hash,
                idempotencyKey: input.idempotencyKey ?? null,
              })
              .returning({ id: bookings.id });
            await sp.insert(bookingServices).values(
              availability.services.map((s, position) => ({
                bookingId: created.id,
                serviceId: s.id,
                position,
                nameSnapshot: s.name,
                durationMin: s.durationMin,
                bufferMin: s.bufferMin,
                priceCents: s.priceCents,
              })),
            );
            return created;
          });
          return { bookingId: booking.id, staffId, startsAt, manageToken: token };
        } catch (err) {
          if (pgErrorCode(err) === PG_EXCLUSION_VIOLATION) continue; // taken a moment ago – try next barber
          throw err;
        }
      }
      throw new SlotTaken();
    });
  } catch (err) {
    // A concurrent retry with the same idempotency key won the race: return its booking.
    if (input.idempotencyKey && pgErrorCode(err) === PG_UNIQUE_VIOLATION) {
      const existing = await findByIdempotencyKey(input.businessId, input.idempotencyKey);
      if (existing) return existing;
    }
    if (err instanceof SlotTaken) {
      throw new DomainError("SLOT_UNAVAILABLE", "Someone just booked that time. Please pick another.");
    }
    throw err;
  }
}
