/**
 * Catalog: who works here and what they offer.
 */
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth";
import { businesses } from "./tenancy";

const tz = { withTimezone: true } as const;

/** A bookable professional (barber). May or may not have a login. */
export const staff = pgTable(
  "staff",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Optional link to a login, so a barber can see their own calendar later. */
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
    title: text(),
    bio: text(),
    photoUrl: text(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp(tz).notNull().defaultNow(),
    updatedAt: timestamp(tz)
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index().on(t.businessId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    category: text(),
    durationMin: integer().notNull(),
    /** Cleanup time blocked after the service; not shown to the customer. */
    bufferMin: integer().notNull().default(0),
    /** Money is always stored in minor units (cents). */
    priceCents: integer().notNull(),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp(tz).notNull().defaultNow(),
    updatedAt: timestamp(tz)
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index().on(t.businessId),
    check("services_duration_positive", sql`${t.durationMin} > 0`),
    check("services_buffer_non_negative", sql`${t.bufferMin} >= 0`),
    check("services_price_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

/** Which professional can perform which service. */
export const staffServices = pgTable(
  "staff_services",
  {
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.serviceId] }), index().on(t.serviceId)],
);
