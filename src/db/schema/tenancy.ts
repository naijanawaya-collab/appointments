/**
 * Tenancy: every business (tenant) and how it is reached.
 *
 * RULE: every tenant-owned table carries `business_id`, and every query
 * filters by it. That is what makes tenant #2 a data change, not a rewrite.
 */
import {
  boolean,
  char,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const tz = { withTimezone: true } as const;

export const businessCategory = pgEnum("business_category", ["barber", "beauty", "other"]);

export const businesses = pgTable("businesses", {
  id: uuid().primaryKey().defaultRandom(),
  /** Full name, e.g. "Kaiser & Co. Gentlemen's Barbers" */
  name: text().notNull(),
  /** Header / email sender name, e.g. "Kaiser & Co." */
  shortName: text(),
  /** Monogram used when there is no logo */
  mark: text(),
  /** Used for the platform URL: /[slug] */
  slug: text().notNull().unique(),
  category: businessCategory().notNull().default("barber"),
  /** IANA zone, e.g. "Europe/Vienna". All slot maths happens in this zone. */
  timezone: text().notNull().default("Europe/Vienna"),
  /** ISO 4217, e.g. "EUR" */
  currency: char({ length: 3 }).notNull().default("EUR"),
  locale: text().notNull().default("de-AT"),

  // Contact & location
  email: text(),
  phone: text(),
  address: text(),
  lat: doublePrecision(),
  lon: doublePrecision(),
  instagram: text(),
  tiktok: text(),
  /** Phone number used for wa.me links; falls back to `phone` */
  whatsapp: text(),

  // Storefront copy
  description: text(),
  eyebrow: text(),
  tagline: text(),
  about: text(),
  aboutTitle: text(),
  ratingValue: real(),
  ratingCount: integer(),

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
    /** Set once DNS points at the platform and the hosting provider verified it */
    verifiedAt: timestamp(tz),
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
