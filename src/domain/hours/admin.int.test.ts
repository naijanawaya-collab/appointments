import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { hoursSchema } from "@/validation/admin";
import { createShop, resetDb, type Shop } from "../../../tests/support/fixtures";
import { addClosure, getOpeningHours, listClosures, removeClosure, setOpeningHours } from "./admin";

let a: Shop;
let b: Shop;

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
});
afterAll(resetDb);

describe("opening hours", () => {
  it("replaces the week, with a lunch break on Saturday", async () => {
    const week = hoursSchema.parse([
      { weekday: 6, startTime: "14:00", endTime: "18:00" },
      { weekday: 6, startTime: "9:00", endTime: "13:00" },
      { weekday: 1, startTime: "10:00", endTime: "19:00" },
    ]);
    await setOpeningHours(a.business.id, week);
    expect(await getOpeningHours(a.business.id)).toEqual([
      { weekday: 1, startTime: "10:00", endTime: "19:00" },
      { weekday: 6, startTime: "09:00", endTime: "13:00" },
      { weekday: 6, startTime: "14:00", endTime: "18:00" },
    ]);
    expect(await getOpeningHours(b.business.id)).toHaveLength(7); // untouched
  });
});

describe("closures", () => {
  it("adds, lists upcoming only, and removes within the shop", async () => {
    const past = await addClosure(a.business.id, { startsOn: "2026-01-01", endsOn: "2026-01-01", label: "New Year" });
    const xmas = await addClosure(a.business.id, { startsOn: "2026-12-24", endsOn: "2026-12-26", label: "Christmas" });
    expect((await listClosures(a.business.id, "2026-10-08")).map((c) => c.id)).toEqual([xmas.id]);
    await expect(removeClosure(b.business.id, xmas.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeClosure(a.business.id, past.id);
  });
});
