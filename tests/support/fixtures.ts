/**
 * Integration-test fixtures: build a small, realistic tenant in the test DB.
 * Only imported by *.int.test.ts files (DATABASE_URL points at the test DB).
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";

/** Empties every table between tests. */
export async function resetDb() {
  await db.execute(sql`
    TRUNCATE TABLE booking_services, bookings, customers, time_off, working_hours,
      staff_services, services, staff, members, business_domains, businesses,
      session, account, verification, "user"
    RESTART IDENTITY CASCADE
  `);
}

type ShopOptions = {
  slug?: string;
  timezone?: string;
  minLeadTimeMin?: number;
  cancellationWindowHours?: number;
  email?: string | null;
  /** ISO weekdays the barbers work 09:00-12:00 (default: every day). */
  weekdays?: number[];
};

/**
 * One business with two barbers (Anna, Ben) who both work 09:00-12:00,
 * a 30-min Haircut (+5 buffer) both can do, and a 20-min Beard trim only Anna does.
 */
export async function createShop(opts: ShopOptions = {}) {
  const [business] = await db
    .insert(s.businesses)
    .values({
      name: `Shop ${opts.slug ?? "test"}`,
      slug: opts.slug ?? "test-shop",
      timezone: opts.timezone ?? "Europe/Vienna",
      minLeadTimeMin: opts.minLeadTimeMin ?? 0,
      cancellationWindowHours: opts.cancellationWindowHours ?? 24,
      email: opts.email === undefined ? "owner@shop.test" : opts.email,
    })
    .returning();

  const [haircut, beard] = await db
    .insert(s.services)
    .values([
      { businessId: business.id, name: "Haircut", durationMin: 30, bufferMin: 5, priceCents: 2500, sortOrder: 0 },
      { businessId: business.id, name: "Beard trim", durationMin: 20, bufferMin: 0, priceCents: 1500, sortOrder: 1 },
    ])
    .returning();

  const [anna, ben] = await db
    .insert(s.staff)
    .values([
      { businessId: business.id, displayName: "Anna", sortOrder: 0 },
      { businessId: business.id, displayName: "Ben", sortOrder: 1 },
    ])
    .returning();

  await db.insert(s.staffServices).values([
    { staffId: anna.id, serviceId: haircut.id },
    { staffId: anna.id, serviceId: beard.id },
    { staffId: ben.id, serviceId: haircut.id },
  ]);

  const weekdays = opts.weekdays ?? [1, 2, 3, 4, 5, 6, 7];
  await db.insert(s.workingHours).values(
    [anna, ben].flatMap((st) =>
      weekdays.map((weekday) => ({ staffId: st.id, weekday, startTime: "09:00", endTime: "12:00" })),
    ),
  );

  return { business, haircut, beard, anna, ben };
}

export type Shop = Awaited<ReturnType<typeof createShop>>;

/** A fixed "now" well before the test dates, so lead time and horizon never interfere. */
export const NOW = new Date("2026-10-05T06:00:00Z"); // Monday 08:00 Vienna
export const DATE = "2026-10-06"; // Tuesday
