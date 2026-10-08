import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { zonedDateTime } from "@/domain/availability/compute-slots";
import { getAvailability } from "@/domain/availability/get-availability";
import { createBooking } from "@/domain/booking/create-booking";
import { staffSchema } from "@/validation/admin";
import { createShop, DATE, NOW, resetDb, type Shop } from "../../../tests/support/fixtures";
import { addTimeOff, createStaff, deleteStaff, getStaffMember, listStaff, moveStaff, removeTimeOff, setWorkingHours, updateStaff } from "./admin";

let a: Shop;
let b: Shop;
const TZ = "Europe/Vienna";

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
});
afterAll(resetDb);

const form = (overrides: Record<string, unknown> = {}) =>
  staffSchema.parse({ displayName: "Clara", title: "Barber", bio: "", photoMediaId: "", isActive: true, serviceIds: [a.haircut.id], ...overrides });

describe("team", () => {
  it("a new professional gets the shop's opening hours and becomes bookable", async () => {
    const clara = await createStaff(a.business.id, form());
    const { hours, member } = await getStaffMember(a.business.id, clara.id);
    expect(member.serviceIds).toEqual([a.haircut.id]);
    expect(hours).toHaveLength(7);
    expect(hours[0]).toMatchObject({ startTime: "09:00", endTime: "12:00" });
    const slots = await getAvailability({ businessId: a.business.id, date: DATE, serviceIds: [a.haircut.id], staffId: clara.id, now: NOW });
    expect(slots.slots.length).toBeGreaterThan(0);
  });

  it("updates details and services; rejects another shop's services and members", async () => {
    await updateStaff(a.business.id, a.ben.id, form({ displayName: "Benjamin", serviceIds: [a.haircut.id, a.beard.id] }));
    const ben = (await listStaff(a.business.id)).find((s) => s.id === a.ben.id)!;
    expect(ben).toMatchObject({ displayName: "Benjamin" });
    expect(ben.serviceIds.sort()).toEqual([a.haircut.id, a.beard.id].sort());
    await expect(updateStaff(a.business.id, a.ben.id, form({ serviceIds: [b.haircut.id] }))).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(updateStaff(a.business.id, b.ben.id, form())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(setWorkingHours(a.business.id, b.ben.id, [])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("working hours drive availability", async () => {
    await setWorkingHours(a.business.id, a.anna.id, [{ weekday: 2, startTime: "10:00", endTime: "11:00" }]);
    const { slots } = await getAvailability({ businessId: a.business.id, date: DATE, serviceIds: [a.haircut.id], staffId: a.anna.id, now: NOW });
    expect(slots[0].start).toBe(zonedDateTime(DATE, "10:00", TZ).toISOString());
  });

  it("whole-day time off blocks the day; removing it frees it again", async () => {
    const off = await addTimeOff(a.business.id, TZ, a.anna.id, { startsOn: DATE, endsOn: DATE, startTime: "", endTime: "", reason: "Holiday" });
    expect(off.startsAt.toISOString()).toBe(zonedDateTime(DATE, "00:00", TZ).toISOString());
    expect(off.endsAt.toISOString()).toBe(zonedDateTime("2026-10-07", "00:00", TZ).toISOString());
    const query = { businessId: a.business.id, date: DATE, serviceIds: [a.haircut.id], staffId: a.anna.id, now: NOW };
    expect((await getAvailability(query)).slots).toEqual([]);
    await expect(removeTimeOff(b.business.id, off.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeTimeOff(a.business.id, off.id);
    expect((await getAvailability(query)).slots.length).toBeGreaterThan(0);
  });

  it("reorders, and refuses to delete someone with bookings", async () => {
    await moveStaff(a.business.id, a.ben.id, "up");
    expect((await listStaff(a.business.id)).map((s) => s.displayName)).toEqual(["Ben", "Anna"]);
    await createBooking({
      businessId: a.business.id,
      timezone: TZ,
      serviceIds: [a.haircut.id],
      staffId: a.ben.id,
      startsAt: zonedDateTime(DATE, "09:00", TZ).toISOString(),
      customer: { name: "Max", email: "max@example.com" },
      now: NOW,
    });
    await expect(deleteStaff(a.business.id, a.ben.id)).rejects.toMatchObject({ code: "CONFLICT" });
    await deleteStaff(a.business.id, a.anna.id);
    expect((await listStaff(a.business.id)).map((s) => s.displayName)).toEqual(["Ben"]);
  });
});
