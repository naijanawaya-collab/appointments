/**
 * Scheduling: when each professional is available.
 *
 * Working hours are wall-clock times in the business's timezone
 * (so "09:00" stays 09:00 across daylight-saving changes).
 * Time off is an absolute UTC range.
 */
import { check, index, pgTable, smallint, text, time, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { staff } from "./catalog";

const tz = { withTimezone: true } as const;

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid().primaryKey().defaultRandom(),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    /** ISO weekday: 1 = Monday ... 7 = Sunday. Multiple rows per day = breaks. */
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
