import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { bookings, closures, customers, timeOff } from "@/db/schema";
import { zonedDateTime } from "./compute-slots";
import { getAvailability } from "./get-availability";
import { findNextAvailable, nextAvailableLabel } from "./next-available";
import { createShop, DATE, NOW, resetDb, type Shop } from "../../../tests/support/fixtures";

const TZ = "Europe/Vienna";
const at = (time: string) => zonedDateTime(DATE, time, TZ);
const local = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

let shop: Shop;

beforeEach(async () => {
  await resetDb();
  shop = await createShop();
});

afterAll(async () => {
  await resetDb();
});

async function addBooking(staffId: string, start: string, end: string, status: "confirmed" | "cancelled" = "confirmed") {
  const [customer] = await db
    .insert(customers)
    .values({ businessId: shop.business.id, name: "C", email: `${start}-${staffId}@x.test` })
    .returning();
  await db.insert(bookings).values({
    businessId: shop.business.id,
    staffId,
    customerId: customer.id,
    startsAt: at(start),
    endsAt: at(end),
    status,
  });
}

describe("getAvailability", () => {
  it("offers slots inside working hours for a specific professional", async () => {
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      now: NOW,
    });
    expect(slots.map((s) => local(s.start))).toEqual([
      "09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45",
      "11:00", "11:15", "11:30",
    ]);
    expect(slots.every((s) => s.staffIds.length === 1 && s.staffIds[0] === shop.anna.id)).toBe(true);
  });

  it("merges professionals for 'any' and respects existing bookings incl. buffer", async () => {
    // Anna busy 09:00-09:35 (30 min haircut + 5 buffer)
    await addBooking(shop.anna.id, "09:00", "09:35");
    const { slots, blockDurationMin } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: "any",
      now: NOW,
    });
    expect(blockDurationMin).toBe(35);
    const nine = slots.find((s) => local(s.start) === "09:00")!;
    expect(nine.staffIds).toEqual([shop.ben.id]);
    const nineThirty = slots.find((s) => local(s.start) === "09:30")!;
    expect(nineThirty.staffIds).toEqual([shop.ben.id]); // Anna still busy until 09:35
    const nineFortyFive = slots.find((s) => local(s.start) === "09:45")!;
    expect(nineFortyFive.staffIds).toEqual([shop.anna.id, shop.ben.id]);
  });

  it("ignores cancelled bookings", async () => {
    await addBooking(shop.anna.id, "09:00", "09:35", "cancelled");
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      now: NOW,
    });
    expect(local(slots[0].start)).toBe("09:00");
  });

  it("removes time off", async () => {
    await db.insert(timeOff).values({ staffId: shop.anna.id, startsAt: at("09:00"), endsAt: at("11:00") });
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      now: NOW,
    });
    expect(slots.map((s) => local(s.start))).toEqual(["11:00", "11:15", "11:30"]);
  });

  it("only includes professionals who perform every selected service", async () => {
    const { slots, serviceDurationMin } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id, shop.beard.id],
      staffId: "any",
      now: NOW,
    });
    expect(serviceDurationMin).toBe(50);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.staffIds.join() === shop.anna.id)).toBe(true);
  });

  it("returns no slots when the chosen professional can't do the service", async () => {
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.beard.id],
      staffId: shop.ben.id,
      now: NOW,
    });
    expect(slots).toEqual([]);
  });

  it("rejects services from another business (tenant isolation)", async () => {
    const other = await createShop({ slug: "other-shop" });
    await expect(
      getAvailability({
        businessId: shop.business.id,
        date: DATE,
        serviceIds: [other.haircut.id],
        staffId: "any",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "INVALID_SELECTION" });
  });

  it("never offers another business's professional", async () => {
    const other = await createShop({ slug: "other-shop" });
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: other.anna.id,
      now: NOW,
    });
    expect(slots).toEqual([]);
  });

  it("rejects inactive services and invalid dates", async () => {
    await expect(
      getAvailability({ businessId: shop.business.id, date: "2026-02-31", serviceIds: [shop.haircut.id], staffId: "any", now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID_SELECTION" });
    await expect(
      getAvailability({ businessId: shop.business.id, date: DATE, serviceIds: [], staffId: "any", now: NOW }),
    ).rejects.toMatchObject({ code: "INVALID_SELECTION" });
  });

  it("returns nothing on a day nobody works", async () => {
    await resetDb();
    shop = await createShop({ weekdays: [3] }); // Wednesday only
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE, // Tuesday
      serviceIds: [shop.haircut.id],
      staffId: "any",
      now: NOW,
    });
    expect(slots).toEqual([]);
  });

  it("returns nothing on a shop closure day (holiday)", async () => {
    await db.insert(closures).values({ businessId: shop.business.id, startsOn: DATE, endsOn: DATE, label: "Holiday" });
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: "any",
      now: NOW,
    });
    expect(slots).toEqual([]);
  });
});

describe("findNextAvailable", () => {
  it("finds the first free time, skipping closures", async () => {
    await db.insert(closures).values({ businessId: shop.business.id, startsOn: "2026-10-05", endsOn: "2026-10-06" });
    const next = await findNextAvailable({ businessId: shop.business.id, timezone: TZ, now: NOW });
    expect(next).toMatchObject({ date: "2026-10-07", time: "09:00" });
    expect(next?.label).toBe("Wed 7 Oct 09:00");
  });

  it("labels today and tomorrow", () => {
    expect(nextAvailableLabel("2026-10-05T13:30:00.000Z", TZ, NOW)).toBe("today 15:30");
    expect(nextAvailableLabel("2026-10-06T07:00:00.000Z", TZ, NOW)).toBe("tomorrow 09:00");
  });

  it("returns null when the shop has no services", async () => {
    await resetDb();
    const other = await createShop({ slug: "empty" });
    await db.delete(bookings);
    const { services } = await import("@/db/schema");
    await db.delete(services).where(eq(services.businessId, other.business.id));
    expect(await findNextAvailable({ businessId: other.business.id, timezone: TZ, now: NOW })).toBeNull();
  });
});
