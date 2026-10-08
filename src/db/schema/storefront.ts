/**
 * Storefront presentation: one Zod-validated JSON document per business
 * (see src/domain/storefront/config.ts), with a draft the owner edits and a
 * published copy visitors see. Plus manually entered reviews.
 */
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { businesses } from "./tenancy";

const tz = { withTimezone: true } as const;

export const storefrontConfigs = pgTable("storefront_configs", {
  businessId: uuid()
    .primaryKey()
    .references(() => businesses.id, { onDelete: "cascade" }),
  draft: jsonb().notNull(),
  published: jsonb().notNull(),
  publishedAt: timestamp(tz),
  updatedAt: timestamp(tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedBy: text().references(() => user.id, { onDelete: "set null" }),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    quote: text().notNull(),
    author: text().notNull(),
    source: text().notNull().default("Google"),
    position: integer().notNull().default(0),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [index().on(t.businessId)],
);
