import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingServices, bookings, customers } from "@/db/schema";
import { getAvailability } from "@/domain/availability/get-availability";
import { zonedDateTime } from "@/domain/availability/compute-slots";
import { onBookingCancelled, onBookingCreated } from "@/domain/notifications/handlers";
import { outbox } from "@/lib/email";
import { createShop, DATE, NOW, resetDb, type Shop } from "../../../tests/support/fixtures";
import { cancelBookingByToken } from "./cancel-booking";
import { createBooking, type CreateBookingInput } from "./create-booking";
import { getBookingByToken } from "./get-booking";
import { hashManageToken } from "./tokens";

const TZ = "Europe/Vienna";
const at = (time: string) => zonedDateTime(DATE, time, TZ).toISOString();

let shop: Shop;

beforeEach(async () => {
  await resetDb();
  outbox.length = 0;
  shop = await createShop();
});

afterAll(async () => {
  await resetDb();
});

const input = (overrides: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
  businessId: shop.business.id,
  timezone: TZ,
  serviceIds: [shop.haircut.id],
  staffId: "any",
  startsAt: at("09:00"),
  customer: { name: "Maria Muster", email: "Maria@Example.com", phone: "+43 660 1234567" },
  now: NOW,
  ...overrides,
});

describe("createBooking", () => {
  it("creates the booking, customer, service snapshot and a hashed manage token", async () => {
    const result = await createBooking(input({ customerNote: "  Short on the sides  " }));

    const [row] = await db.select().from(bookings).where(eq(bookings.id, result.bookingId));
    expect(row.status).toBe("confirmed");
    expect(row.staffId).toBe(shop.anna.id); // first barber in sort order
    expect(row.startsAt.toISOString()).toBe(at("09:00"));
    expect(row.endsAt.toISOString()).toBe(at("09:35")); // 30 min + 5 buffer
    expect(row.totalPriceCents).toBe(2500);
    expect(row.customerNote).toBe("Short on the sides");
    expect(row.manageTokenHash).toBe(hashManageToken(result.manageToken));
    expect(row.manageTokenHash).not.toBe(result.manageToken);

    const items = await db.select().from(bookingServices).where(eq(bookingServices.bookingId, row.id));
    expect(items).toMatchObject([{ nameSnapshot: "Haircut", durationMin: 30, bufferMin: 5, priceCents: 2500 }]);

    const [customer] = await db.select().from(customers).where(eq(customers.id, row.customerId));
    expect(customer.email).toBe("maria@example.com");
  });

  it("reuses the customer for the same email (case-insensitive) and updates the name", async () => {
    await createBooking(input());
    await createBooking(input({ startsAt: at("10:00"), customer: { name: "Maria M.", email: "MARIA@example.com" } }));
    const rows = await db.select().from(customers).where(eq(customers.businessId, shop.business.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Maria M.");
    expect(rows[0].phone).toBe("+43 660 1234567"); // kept when not provided again
  });

  it("rejects times that are not offered (outside hours, off-grid, past)", async () => {
    for (const startsAt of [at("08:00"), at("09:07"), at("11:45"), "2026-10-01T07:00:00.000Z"]) {
      await expect(createBooking(input({ startsAt }))).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
    }
  });

  it("rejects a professional who doesn't offer the service", async () => {
    await expect(
      createBooking(input({ serviceIds: [shop.beard.id], staffId: shop.ben.id })),
    ).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });

  it("rejects another business's services or staff (tenant isolation)", async () => {
    const other = await createShop({ slug: "other" });
    await expect(createBooking(input({ serviceIds: [other.haircut.id] }))).rejects.toMatchObject({
      code: "INVALID_SELECTION",
    });
    await expect(createBooking(input({ staffId: other.anna.id }))).rejects.toMatchObject({
      code: "SLOT_UNAVAILABLE",
    });
  });

  it("never double-books a professional when two customers race for the same slot", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        createBooking(input({ staffId: shop.anna.id, customer: { name: `C${i}`, email: `c${i}@x.test` } })),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a) => a.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(4);
    failed.forEach((f) => expect(f.reason).toMatchObject({ code: "SLOT_UNAVAILABLE" }));

    const rows = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.staffId, shop.anna.id), eq(bookings.status, "confirmed")));
    expect(rows).toHaveLength(1);
  });

  it("assigns the next free barber for 'any professional' under contention", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 3 }, (_, i) =>
        createBooking(input({ customer: { name: `C${i}`, email: `c${i}@x.test` } })),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled") as PromiseFulfilledResult<{ staffId: string }>[];
    expect(ok).toHaveLength(2); // two barbers, three customers
    expect(new Set(ok.map((o) => o.value.staffId))).toEqual(new Set([shop.anna.id, shop.ben.id]));
  });

  it("removes the booked slot from availability", async () => {
    await createBooking(input({ staffId: shop.anna.id }));
    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      now: NOW,
    });
    expect(slots.map((s) => s.start)).not.toContain(at("09:00"));
    expect(slots.map((s) => s.start)).not.toContain(at("09:30")); // buffer until 09:35
    expect(slots.map((s) => s.start)).toContain(at("09:45"));
  });
});

describe("manage link & cancellation", () => {
  it("finds the booking by raw token only", async () => {
    const { manageToken } = await createBooking(input());
    const details = await getBookingByToken(manageToken);
    expect(details).toMatchObject({ staffName: "Anna", durationMin: 30, customer: { name: "Maria Muster" } });
    expect(await getBookingByToken(hashManageToken(manageToken))).toBeNull();
    expect(await getBookingByToken("x".repeat(43))).toBeNull();
  });

  it("cancels, frees the slot, and can't be cancelled twice", async () => {
    const { manageToken } = await createBooking(input({ staffId: shop.anna.id }));
    const cancelled = await cancelBookingByToken(manageToken, { now: NOW });
    expect(cancelled.status).toBe("cancelled");

    const { slots } = await getAvailability({
      businessId: shop.business.id,
      date: DATE,
      serviceIds: [shop.haircut.id],
      staffId: shop.anna.id,
      now: NOW,
    });
    expect(slots.map((s) => s.start)).toContain(at("09:00"));

    await expect(cancelBookingByToken(manageToken, { now: NOW })).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("refuses online cancellation inside the cancellation window", async () => {
    const { manageToken } = await createBooking(input());
    const lateNow = new Date(new Date(at("09:00")).getTime() - 2 * 3_600_000); // 2h before, window is 24h
    await expect(cancelBookingByToken(manageToken, { now: lateNow })).rejects.toMatchObject({
      code: "CANCELLATION_CLOSED",
    });
  });

  it("returns not found for unknown tokens", async () => {
    await expect(cancelBookingByToken("A".repeat(43))).rejects.toMatchObject({ code: "BOOKING_NOT_FOUND" });
  });
});

describe("notifications", () => {
  it("emails the customer (with manage link) and the shop owner", async () => {
    const { bookingId } = await createBooking(
      input({ customer: { name: "<script>alert(1)</script>", email: "x@example.com" } }),
    );
    await onBookingCreated(bookingId, "https://shop.test/manage/abc");

    expect(outbox.map((m) => m.to).sort()).toEqual(["owner@shop.test", "x@example.com"]);
    const customerMail = outbox.find((m) => m.to === "x@example.com")!;
    expect(customerMail.subject).toContain("Booking confirmed");
    expect(customerMail.html).toContain("https://shop.test/manage/abc");
    expect(customerMail.html).not.toContain("<script>");
    expect(customerMail.html).toContain("&lt;script&gt;");
  });

  it("skips the owner email when the business has no email", async () => {
    await resetDb();
    shop = await createShop({ email: null });
    const { bookingId, manageToken } = await createBooking(input());
    await onBookingCreated(bookingId, "https://shop.test/manage/x");
    expect(outbox.map((m) => m.to)).toEqual(["maria@example.com"]);

    outbox.length = 0;
    await onBookingCancelled(await cancelBookingByToken(manageToken, { now: NOW }));
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toContain("cancelled");
  });
});
