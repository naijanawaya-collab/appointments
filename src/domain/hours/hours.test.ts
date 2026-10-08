import { describe, expect, it } from "vitest";
import { closedDates, formatRanges, holidayNotice, openStatus, openStatusText, weeklyHours, type OpeningRow } from "./hours";

const TZ = "Europe/Vienna";
/** Kaiser: Tue–Fri 09–13 + 14–19, Sat 09–16, Sun/Mon closed. */
const KAISER: OpeningRow[] = [
  ...[2, 3, 4, 5].flatMap((weekday) => [
    { weekday, startTime: "09:00:00", endTime: "13:00:00" },
    { weekday, startTime: "14:00:00", endTime: "19:00:00" },
  ]),
  { weekday: 6, startTime: "09:00", endTime: "16:00" },
];
// Thu 8 Oct 2026 (CEST, UTC+2)
const at = (local: string) => new Date(`${local}+02:00`);

describe("weekly hours", () => {
  it("builds Mon…Sun with formatted ranges", () => {
    const week = weeklyHours(KAISER);
    expect(week.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(formatRanges(week[3].ranges)).toBe("09:00–13:00 · 14:00–19:00");
    expect(formatRanges(week[0].ranges)).toBe("Closed");
  });
});

describe("openStatus (TEST-PLAN S-12)", () => {
  it("Thu 11:20 → open until 13:00", () => {
    expect(openStatusText(openStatus(at("2026-10-08T11:20:00"), TZ, KAISER))).toEqual({ strong: "Open now", rest: "until 13:00" });
  });

  it("Thu 13:30 → closed, opens 14:00", () => {
    expect(openStatusText(openStatus(at("2026-10-08T13:30:00"), TZ, KAISER))).toEqual({ strong: "Closed", rest: "· opens 14:00" });
  });

  it("Mon → closed, opens Tue 09:00", () => {
    expect(openStatusText(openStatus(at("2026-10-12T10:00:00"), TZ, KAISER))).toEqual({ strong: "Closed", rest: "· opens Tue 09:00" });
  });

  it("Sat after closing → opens Tue 09:00", () => {
    expect(openStatusText(openStatus(at("2026-10-10T17:00:00"), TZ, KAISER)).rest).toBe("· opens Tue 09:00");
  });

  it("skips closures", () => {
    const s = openStatus(at("2026-10-12T10:00:00"), TZ, KAISER, [{ startsOn: "2026-10-13", endsOn: "2026-10-14" }]);
    expect(openStatusText(s).rest).toBe("· opens Thu 09:00");
  });

  it("uses shop time even when the server runs in UTC", () => {
    // 07:30 UTC = 09:30 Vienna
    expect(openStatus(new Date("2026-10-08T07:30:00Z"), TZ, KAISER).open).toBe(true);
  });

  it("never opens when there are no hours", () => {
    expect(openStatus(at("2026-10-08T11:00:00"), TZ, [])).toEqual({ open: false, opensAt: null });
  });
});

describe("holiday notice", () => {
  const closures = [
    { startsOn: "2026-12-24", endsOn: "2026-12-26" },
    { startsOn: "2027-01-01", endsOn: "2027-01-01" },
  ];

  it("shows closures starting within 30 days", () => {
    expect(holidayNotice(at("2026-12-05T10:00:00"), TZ, closures)).toBe("closed 24–26 Dec and 1 Jan.");
    expect(holidayNotice(at("2026-12-01T10:00:00"), TZ, closures)).toBe("closed 24–26 Dec.");
  });

  it("hides when nothing is within 30 days", () => {
    expect(holidayNotice(at("2026-10-08T10:00:00"), TZ, closures)).toBeNull();
  });

  it("formats ranges across months", () => {
    expect(holidayNotice(at("2026-12-20T10:00:00"), TZ, [{ startsOn: "2026-12-30", endsOn: "2027-01-02" }])).toBe(
      "closed 30 Dec–2 Jan.",
    );
  });
});

describe("closedDates", () => {
  it("marks days without hours and closure days", () => {
    const closed = closedDates("2026-10-08", 7, KAISER, [{ startsOn: "2026-10-09", endsOn: "2026-10-09" }]);
    expect([...closed].sort()).toEqual(["2026-10-09", "2026-10-11", "2026-10-12"]); // Fri closure, Sun, Mon
  });
});
