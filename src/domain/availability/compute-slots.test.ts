import { describe, expect, it } from "vitest";
import {
  computeSlots,
  daysBetween,
  isoWeekday,
  localDateString,
  localDayRange,
  parseLocalDate,
  zonedDateTime,
  type ComputeSlotsInput,
} from "./compute-slots";

const TZ = "Europe/Vienna";

/** Tuesday 2026-10-06; "now" is the Monday before at 12:00 Vienna time. */
const base: ComputeSlotsInput = {
  date: "2026-10-06",
  timezone: TZ,
  now: new Date("2026-10-05T10:00:00Z"),
  slotIntervalMin: 15,
  minLeadTimeMin: 60,
  maxAdvanceDays: 60,
  serviceDurationMin: 30,
  blockDurationMin: 30,
  staff: [{ staffId: "a", windows: [{ start: "09:00", end: "10:00" }], busy: [] }],
};

const localTimes = (slots: { start: string }[]) =>
  slots.map((s) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(
      new Date(s.start),
    ),
  );

describe("date helpers", () => {
  it("parses and validates local dates", () => {
    expect(parseLocalDate("2026-10-06")).toEqual({ year: 2026, month: 10, day: 6 });
    expect(parseLocalDate("2026-02-30")).toBeNull();
    expect(parseLocalDate("2026-1-6")).toBeNull();
    expect(parseLocalDate("nonsense")).toBeNull();
  });

  it("computes ISO weekdays", () => {
    expect(isoWeekday("2026-10-05")).toBe(1); // Monday
    expect(isoWeekday("2026-10-11")).toBe(7); // Sunday
  });

  it("uses the business timezone for 'today'", () => {
    // 23:30 UTC on Oct 5 is already Oct 6 in Vienna (UTC+2).
    expect(localDateString(new Date("2026-10-05T23:30:00Z"), TZ)).toBe("2026-10-06");
    expect(daysBetween("2026-10-05", "2026-10-07")).toBe(2);
  });

  it("converts wall-clock time to UTC across DST", () => {
    expect(zonedDateTime("2026-07-01", "09:00", TZ).toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(zonedDateTime("2026-12-01", "09:00", TZ).toISOString()).toBe("2026-12-01T08:00:00.000Z");
  });

  it("returns 23h and 25h days on DST changes", () => {
    const spring = localDayRange("2026-03-29", TZ);
    const autumn = localDayRange("2026-10-25", TZ);
    expect((spring.end.getTime() - spring.start.getTime()) / 3_600_000).toBe(23);
    expect((autumn.end.getTime() - autumn.start.getTime()) / 3_600_000).toBe(25);
  });
});

describe("computeSlots", () => {
  it("generates slots on the grid where the service fits", () => {
    expect(localTimes(computeSlots(base))).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("returns UTC ISO strings", () => {
    expect(computeSlots(base)[0].start).toBe("2026-10-06T07:00:00.000Z");
  });

  it("supports breaks via multiple windows", () => {
    const slots = computeSlots({
      ...base,
      staff: [
        {
          staffId: "a",
          windows: [
            { start: "09:00", end: "09:30" },
            { start: "10:00", end: "10:30" },
          ],
          busy: [],
        },
      ],
    });
    expect(localTimes(slots)).toEqual(["09:00", "10:00"]);
  });

  it("lets the buffer run past closing but not the service", () => {
    const slots = computeSlots({ ...base, blockDurationMin: 40 });
    expect(localTimes(slots)).toEqual(["09:00", "09:15", "09:30"]);
  });

  it("blocks slots whose buffer would overlap the next booking", () => {
    const busy = [{ start: zonedDateTime(base.date, "09:40", TZ), end: zonedDateTime(base.date, "10:00", TZ) }];
    const slots = computeSlots({
      ...base,
      blockDurationMin: 35,
      staff: [{ ...base.staff[0], busy }],
    });
    // 09:00 + 35 = 09:35 ok; 09:15 + 35 = 09:50 overlaps; 09:30 overlaps.
    expect(localTimes(slots)).toEqual(["09:00"]);
  });

  it("treats back-to-back bookings as free (half-open intervals)", () => {
    const busy = [{ start: zonedDateTime(base.date, "09:00", TZ), end: zonedDateTime(base.date, "09:30", TZ) }];
    const slots = computeSlots({ ...base, staff: [{ ...base.staff[0], busy }] });
    expect(localTimes(slots)).toEqual(["09:30"]);
  });

  it("respects the minimum lead time", () => {
    const now = zonedDateTime(base.date, "08:20", TZ); // earliest = 09:20
    expect(localTimes(computeSlots({ ...base, now }))).toEqual(["09:30"]);
  });

  it("returns nothing for past dates and beyond the booking horizon", () => {
    expect(computeSlots({ ...base, date: "2026-10-04" })).toEqual([]);
    expect(computeSlots({ ...base, maxAdvanceDays: 0 })).toEqual([]);
    expect(computeSlots({ ...base, maxAdvanceDays: 1 })).not.toEqual([]);
  });

  it("returns nothing for invalid input", () => {
    expect(computeSlots({ ...base, date: "2026-13-01" })).toEqual([]);
    expect(computeSlots({ ...base, serviceDurationMin: 0 })).toEqual([]);
  });

  it("merges staff for 'any professional' and keeps input order", () => {
    const slots = computeSlots({
      ...base,
      staff: [
        { staffId: "b", windows: [{ start: "09:30", end: "10:00" }], busy: [] },
        { staffId: "a", windows: [{ start: "09:00", end: "10:00" }], busy: [] },
      ],
    });
    expect(slots.map((s) => [localTimes([s])[0], s.staffIds])).toEqual([
      ["09:00", ["a"]],
      ["09:15", ["a"]],
      ["09:30", ["b", "a"]],
    ]);
  });

  it("keeps 09:00 local on the spring-forward day", () => {
    const slots = computeSlots({
      ...base,
      date: "2026-03-29",
      now: new Date("2026-03-27T10:00:00Z"),
    });
    expect(slots[0].start).toBe("2026-03-29T07:00:00.000Z"); // CEST, UTC+2
  });

  it("keeps 09:00 local on the fall-back day", () => {
    const slots = computeSlots({
      ...base,
      date: "2026-10-25",
      now: new Date("2026-10-23T10:00:00Z"),
    });
    expect(slots[0].start).toBe("2026-10-25T08:00:00.000Z"); // CET, UTC+1
  });
});
