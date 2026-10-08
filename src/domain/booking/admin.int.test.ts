import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { zonedDateTime } from "@/domain/availability/compute-slots";
import { createShop, DATE, NOW, resetDb, type Shop } from "../../../tests/support/fixtures";
import { cancelBookingByShop, dayStats, getAdminBooking, listBookings, listBookingsForDay, setBookingOutcome, setInternalNote, shopActions } from "./admin";
import { createBooking } from "./create-booking";

const TZ = "Europe/Vienna";
const at = (time: string, date = DATE) => zonedDateTime(date, time, TZ);

let a: Shop;
let b: Shop;

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
});
afterAll(resetDb);

const book = (shop: Shop, time: string, name = "Maria Muster", email: string | null = "maria@example.com", staffId: string = shop.anna.id) =>
  createBooking({
    businessId: shop.business.id,
    timezone: TZ,
    serviceIds: [shop.haircut.id],
    staffId,
    startsAt: at(time).toISOString(),
    customer: { name, email },
    now: NOW,
  });

describe("shop-side bookings", () => {
  it("lists a day in time order with service names", async () => {
    await book(a, "10:00", "Late");
    await book(a, "09:00", "Early", "early@example.com", a.ben.id);
    await book(b, "09:00", "Other shop");
    const rows = await listBookingsForDay(a.business.id, DATE, TZ);
    expect(rows.map((r) => [r.customerName, r.serviceNames, r.staffName])).toEqual([
      ["Early", "Haircut", "Ben"],
      ["Late", "Haircut", "Anna"],
    ]);
  });

  it("filters upcoming/past, by professional and by search", async () => {
    await book(a, "09:00", "Anna's client");
    await book(a, "10:00", "Ben's client", "ben-client@example.com", a.ben.id);
    const upcoming = await listBookings(a.business.id, { scope: "upcoming", now: NOW });
    expect(upcoming.rows).toHaveLength(2);
    expect((await listBookings(a.business.id, { scope: "past", now: NOW })).rows).toHaveLength(0);
    expect((await listBookings(a.business.id, { scope: "upcoming", staffId: a.ben.id, now: NOW })).rows.map((r) => r.customerName)).toEqual(["Ben's client"]);
    expect((await listBookings(a.business.id, { scope: "upcoming", q: "BEN-CLIENT@", now: NOW })).rows).toHaveLength(1);
    expect((await listBookings(a.business.id, { scope: "upcoming", q: "%", now: NOW })).rows).toHaveLength(0); // LIKE wildcards are literal
    const later = new Date(at("12:00").getTime() + 60_000);
    expect((await listBookings(a.business.id, { scope: "past", now: later })).rows).toHaveLength(2);
  });

  it("cancels any time (no customer deadline) and only inside the shop", async () => {
    const { bookingId } = await book(a, "09:00");
    await expect(cancelBookingByShop(b.business.id, bookingId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const details = await cancelBookingByShop(a.business.id, bookingId, { reason: "Barber sick", now: at("08:55") });
    expect(details.status).toBe("cancelled");
    const row = await getAdminBooking(a.business.id, bookingId);
    expect(row).toMatchObject({ status: "cancelled", cancellationReason: "Barber sick" });
    await expect(cancelBookingByShop(a.business.id, bookingId)).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("marks completed / no-show only after the start, via the state machine", async () => {
    const { bookingId } = await book(a, "09:00");
    await expect(setBookingOutcome(a.business.id, bookingId, "completed", NOW)).rejects.toMatchObject({ code: "INVALID_STATUS" });
    await setBookingOutcome(a.business.id, bookingId, "no_show", at("09:20"));
    expect((await getAdminBooking(a.business.id, bookingId)).status).toBe("no_show");
    await expect(setBookingOutcome(a.business.id, bookingId, "completed", at("09:30"))).rejects.toMatchObject({ code: "INVALID_STATUS" });
    await expect(cancelBookingByShop(a.business.id, bookingId)).rejects.toMatchObject({ code: "INVALID_STATUS" });
    expect(shopActions({ status: "confirmed", startsAt: at("09:00") }, NOW)).toEqual({ cancel: true, complete: false, noShow: false });
  });

  it("keeps an internal note", async () => {
    const { bookingId } = await book(a, "09:00");
    await setInternalNote(a.business.id, bookingId, "Prefers scissors");
    expect((await getAdminBooking(a.business.id, bookingId)).internalNote).toBe("Prefers scissors");
    await expect(setInternalNote(b.business.id, bookingId, "x")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("walk-ins: no email needed, and the online lead time doesn't apply", async () => {
    const shop = await createShop({ slug: "lead", minLeadTimeMin: 120 });
    const now = at("08:50");
    const input = {
      businessId: shop.business.id,
      timezone: TZ,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      startsAt: at("09:00").toISOString(),
      customer: { name: "Walk-in", email: null },
      source: "walk_in" as const,
      now,
    };
    await expect(createBooking(input)).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    const walkIn = await createBooking({ ...input, ignoreLeadTime: true });
    const row = await getAdminBooking(shop.business.id, walkIn.bookingId);
    expect(row).toMatchObject({ source: "walk_in", customerEmail: null });
    // Two walk-ins without email are two different customers.
    await createBooking({ ...input, staffId: shop.ben.id, ignoreLeadTime: true });
  });

  it("computes today's stats", async () => {
    await book(a, "09:00");
    const { bookingId } = await book(a, "10:00", "Cancelled one", "c@example.com");
    await cancelBookingByShop(a.business.id, bookingId);
    const rows = await listBookingsForDay(a.business.id, DATE, TZ);
    const stats = await dayStats(a.business.id, DATE, rows, at("08:00"));
    expect(stats.bookings).toBe(1);
    expect(stats.revenueCents).toBe(2500);
    expect(stats.nextUp?.customerName).toBe("Maria Muster");
    expect(stats.freeSlots).toBeGreaterThan(0);
  });
});
