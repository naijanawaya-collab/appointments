/**
 * Scheduling: when the shop is open and when each professional works.
 *
 * Times of day are wall-clock times in the business timezone (so "09:00"
 * stays 09:00 across daylight-saving changes). Time off is an absolute UTC
 * range; closures are whole local dates.
 */
import { check, date, index, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { staff } from "./catalog";
import { businesses } from "./tenancy";

const tz = { withTimezone: true } as const;

/** Shop opening hours. ISO weekday 1 = Monday … 7 = Sunday. Several rows per day = breaks. */
export const openingHours = pgTable(
  "opening_hours",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  (t) => [
    index().on(t.businessId, t.weekday),
    check("opening_hours_weekday_range", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("opening_hours_end_after_start", sql`${t.endTime} > ${t.startTime}`),
  ],
);

/** Whole-day shop closures (holidays). Inclusive local dates. No bookings on these days. */
export const closures = pgTable(
  "closures",
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    startsOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }).notNull(),
    label: text(),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.businessId, t.startsOn),
    check("closures_end_not_before_start", sql`${t.endsOn} >= ${t.startsOn}`),
  ],
);

/** When a professional works (ISO weekday, wall-clock). */
export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    weekday: smallint().notNull(),
    startTime: time().notNull(),
    endTime: time().notNull(),
  },
  (t) => [
    index().on(t.staffId, t.weekday),
    check("working_hours_weekday_range", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("working_hours_end_after_start", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    startsAt: timestamp(tz).notNull(),
    endsAt: timestamp(tz).notNull(),
    reason: text(),
    createdAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.staffId, t.startsAt),
    check("time_off_end_after_start", sql`${t.endsAt} > ${t.startsAt}`),
  ],
);
