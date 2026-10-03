/**
 * Tenancy: every business (tenant) and how it is reached.
 *
 * RULE: every tenant-owned table carries `business_id`, and every query
 * filters by it. That is what makes tenant #2 a data change, not a rewrite.
 */
import {
  boolean,
  char,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const tz = { withTimezone: true } as const;

export const businesses = pgTable("businesses", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  /** Used for the platform URL: /book/[slug] */
  slug: text().notNull().unique(),
  /** IANA zone, e.g. "Europe/Vienna". All slot maths happens in this zone. */
  timezone: text().notNull().default("Europe/Vienna"),
  /** ISO 4217, e.g. "EUR" */
  currency: char({ length: 3 }).notNull().default("EUR"),
  locale: text().notNull().default("de-AT"),

  email: text(),
  phone: text(),
  address: text(),
  description: text(),
  logoUrl: text(),

  // Booking rules (business-wide defaults)
  slotIntervalMin: integer().notNull().default(15),
  minLeadTimeMin: integer().notNull().default(60),
  maxAdvanceDays: integer().notNull().default(60),
  cancellationWindowHours: integer().notNull().default(24),

  isActive: boolean().notNull().default(true),
  createdAt: timestamp(tz).notNull().defaultNow(),
  updatedAt: timestamp(tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Custom domains. A separate table (not a column) so a business can have
 * both `brosbab.com` and `www.brosbab.com`, or move domains later.
 * Domains are added manually for now: insert a row + add the domain in Vercel.
 */
export const businessDomains = pgTable(
  "business_domains",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    /** Lowercase hostname without port, e.g. "brosbab.com" */
    hostname: text().notNull(),
    isPrimary: boolean().notNull().default(false),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.hostname), index().on(t.businessId)],
);

export const memberRole = pgEnum("member_role", ["owner", "staff"]);

/** Links Better Auth users to the businesses they can administer. */
export const members = pgTable(
  "members",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole().notNull().default("staff"),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.businessId, t.userId), index().on(t.userId)],
);
