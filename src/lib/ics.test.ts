import { describe, expect, it } from "vitest";
import { icsFile } from "./ics";

describe("icsFile", () => {
  const base = {
    uid: "b1@appointments",
    start: new Date("2026-10-09T08:30:00.000Z"), // 10:30 Vienna (CEST)
    minutes: 60,
    title: "Classic cut, Beard trim at Kaiser & Co.",
    location: "Josefstädter Straße 21, 1080 Wien",
    now: new Date("2026-10-08T09:20:00.000Z"),
  };

  it("writes a valid VEVENT in UTC with the right duration", () => {
    const ics = icsFile(base);
    expect(ics).toContain("DTSTART:20261009T083000Z");
    expect(ics).toContain("DTEND:20261009T093000Z");
    expect(ics).toContain("DTSTAMP:20261008T092000Z");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas, semicolons and newlines in text", () => {
    const ics = icsFile({ ...base, description: "Bring; nothing,\nreally" });
    expect(ics).toContain("SUMMARY:Classic cut\\, Beard trim at Kaiser & Co.");
    expect(ics).toContain("DESCRIPTION:Bring\\; nothing\\,\\nreally");
  });

  it("folds long lines at 75 octets", () => {
    const ics = icsFile({ ...base, description: "x".repeat(200) });
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("marks cancellations", () => {
    const ics = icsFile({ ...base, status: "CANCELLED" });
    expect(ics).toContain("METHOD:CANCEL");
    expect(ics).toContain("STATUS:CANCELLED");
  });
});
