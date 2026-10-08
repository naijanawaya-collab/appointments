/**
 * Media library: every image a business uses (hero, gallery, staff photos…).
 * Images live in Cloudinary (or, for demo seed data, an external URL);
 * this table stores the reference plus what the UI needs to render without
 * layout shift (dimensions) and with good crops (focal point).
 */
import { index, integer, pgEnum, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { businesses } from "./tenancy";

const tz = { withTimezone: true } as const;

export const mediaProvider = pgEnum("media_provider", ["cloudinary", "external"]);

export const media = pgTable(
  "media",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    provider: mediaProvider().notNull(),
    /** Cloudinary public_id (provider = cloudinary) */
    publicId: text(),
    /** Absolute URL (provider = external) */
    url: text(),
    width: integer().notNull(),
    height: integer().notNull(),
    bytes: integer(),
    format: text(),
    alt: text().notNull().default(""),
    /** Focal point in percent (0–100); used as CSS object-position */
    focalX: real().notNull().default(50),
    focalY: real().notNull().default(50),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [index().on(t.businessId)],
);
