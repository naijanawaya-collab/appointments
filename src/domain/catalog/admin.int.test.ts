import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingServices } from "@/db/schema";
import { zonedDateTime } from "@/domain/availability/compute-slots";
import { createBooking } from "@/domain/booking/create-booking";
import { serviceSchema } from "@/validation/admin";
import { createShop, DATE, NOW, resetDb, type Shop } from "../../../tests/support/fixtures";
import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  getService,
  listCategories,
  listServices,
  moveCategory,
  moveService,
  updateService,
} from "./admin";

let a: Shop;
let b: Shop;

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
});
afterAll(resetDb);

const form = (overrides: Partial<Record<string, unknown>> = {}) =>
  serviceSchema.parse({
    name: "Skin fade",
    description: "",
    categoryId: a.category.id,
    durationMin: "45",
    bufferMin: "5",
    price: "32,50",
    isActive: true,
    imageMediaId: "",
    staffIds: [a.anna.id],
    ...overrides,
  });

describe("services", () => {
  it("creates a service with price in cents, appended last, with its professionals", async () => {
    const created = await createService(a.business.id, form());
    expect(created).toMatchObject({ name: "Skin fade", priceCents: 3250, durationMin: 45, bufferMin: 5, sortOrder: 2 });
    expect((await getService(a.business.id, created.id)).staffIds).toEqual([a.anna.id]);
  });

  it("updates details and replaces who performs it", async () => {
    const updated = await updateService(a.business.id, a.haircut.id, form({ name: "Haircut deluxe", staffIds: [a.ben.id] }));
    expect(updated.name).toBe("Haircut deluxe");
    expect((await getService(a.business.id, a.haircut.id)).staffIds).toEqual([a.ben.id]);
  });

  it("rejects another shop's professionals, categories and services", async () => {
    await expect(createService(a.business.id, form({ staffIds: [b.anna.id] }))).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createService(a.business.id, form({ categoryId: b.category.id }))).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(updateService(a.business.id, b.haircut.id, form())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteService(a.business.id, b.haircut.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getService(b.business.id, b.haircut.id)).name).toBe("Haircut");
  });

  it("hidden services stay in the admin list", async () => {
    await updateService(a.business.id, a.beard.id, form({ name: "Beard trim", isActive: false, staffIds: [a.anna.id] }));
    const all = await listServices(a.business.id);
    expect(all.find((s) => s.id === a.beard.id)?.isActive).toBe(false);
  });

  it("reorders with up/down", async () => {
    await moveService(a.business.id, a.beard.id, "up");
    expect((await listServices(a.business.id)).map((s) => s.name)).toEqual(["Beard trim", "Haircut"]);
    await moveService(a.business.id, a.beard.id, "up"); // already first: no-op
    expect((await listServices(a.business.id)).map((s) => s.name)).toEqual(["Beard trim", "Haircut"]);
  });

  it("deleting a booked service keeps the booking's snapshot", async () => {
    const booking = await createBooking({
      businessId: a.business.id,
      timezone: "Europe/Vienna",
      serviceIds: [a.haircut.id],
      staffId: "any",
      startsAt: zonedDateTime(DATE, "09:00", "Europe/Vienna").toISOString(),
      customer: { name: "Max", email: "max@example.com" },
      now: NOW,
    });
    await deleteService(a.business.id, a.haircut.id);
    const [item] = await db.select().from(bookingServices).where(eq(bookingServices.bookingId, booking.bookingId));
    expect(item).toMatchObject({ serviceId: null, nameSnapshot: "Haircut", priceCents: 2500 });
  });
});

describe("categories", () => {
  it("creates, reorders and deletes (services become uncategorised)", async () => {
    const shaves = await createCategory(a.business.id, "Shaves");
    await moveCategory(a.business.id, shaves.id, "up");
    expect((await listCategories(a.business.id)).map((c) => c.name)).toEqual(["Shaves", "Cuts"]);
    await deleteCategory(a.business.id, a.category.id);
    expect((await getService(a.business.id, a.haircut.id)).categoryId).toBeNull();
    await expect(deleteCategory(a.business.id, b.category.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("service order within categories", () => {
  it("moves only among services of the same category", async () => {
    const shaves = await createCategory(a.business.id, "Shaves");
    const shave = await createService(a.business.id, form({ name: "Hot towel shave", categoryId: shaves.id }));
    // Haircut, Beard trim (Cuts) · Hot towel shave (Shaves): moving the shave up has no same-category neighbour.
    await moveService(a.business.id, shave.id, "up");
    expect((await listServices(a.business.id)).map((s) => s.name)).toEqual(["Haircut", "Beard trim", "Hot towel shave"]);
    await moveService(a.business.id, a.beard.id, "up");
    expect((await listServices(a.business.id)).map((s) => s.name)).toEqual(["Beard trim", "Haircut", "Hot towel shave"]);
  });
});
