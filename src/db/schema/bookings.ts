/**
 * Customers and bookings.
 *
 * Double-booking protection lives in the DATABASE: migration
 * `0001_booking_no_overlap.sql` adds an exclusion constraint so two active
 * bookings for the same professional can never overlap, even when two
 * customers click the same slot at the same moment.
 */
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { businesses } from "./tenancy";
import { services, staff } from "./catalog";

const tz = { withTimezone: true } as const;

/** Customers are scoped per business (a customer of shop A is unknown to shop B). */
export const customers = pgTable(
  "customers",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text().notNull(),
    /** Stored lowercase. Nullable: walk-ins / phone bookings may have no email. */
    email: text(),
    phone: text(),
    notes: text(),
    marketingOptIn: timestamp(tz),
    createdAt: timestamp(tz).notNull().defaultNow(),
    updatedAt: timestamp(tz)
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex().on(t.businessId, t.email), index().on(t.businessId, t.phone)],
);

/**
 * Booking lifecycle:  pending -> confirmed -> completed | no_show
 *                     pending | confirmed -> cancelled
 * See src/domain/booking/status.ts for the allowed transitions.
 */
export const bookingStatus = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const bookingSource = pgEnum("booking_source", ["online", "admin", "walk_in"]);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: timestamp(tz).notNull(),
    /** Includes service buffers, so the next slot starts after cleanup. */
    endsAt: timestamp(tz).notNull(),
    status: bookingStatus().notNull().default("confirmed"),
    source: bookingSource().notNull().default("online"),
    totalPriceCents: integer().notNull().default(0),
    customerNote: text(),
    internalNote: text(),
    /** SHA-256 of the "manage my booking" token sent by email (never store the raw token). */
    manageTokenHash: text().unique(),
    cancelledAt: timestamp(tz),
    cancellationReason: text(),
    createdAt: timestamp(tz).notNull().defaultNow(),
    updatedAt: timestamp(tz)
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index().on(t.businessId, t.startsAt),
    index().on(t.staffId, t.startsAt),
    index().on(t.customerId),
    check("bookings_end_after_start", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);

/** Snapshot of each service on the booking (price/duration at time of booking). */
export const bookingServices = pgTable(
  "booking_services",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    serviceId: uuid().references(() => services.id, { onDelete: "set null" }),
    position: smallint().notNull().default(0),
    nameSnapshot: text().notNull(),
    durationMin: integer().notNull(),
    bufferMin: integer().notNull().default(0),
    priceCents: integer().notNull(),
  },
  (t) => [index().on(t.bookingId)],
);
