/**
 * iCalendar (.ics) for "Add to calendar" and the email attachment (B-21, E-5).
 * Times are written in UTC (…Z), which every calendar app converts to the
 * device's zone correctly, including across DST. Pure and unit-tested.
 */

/** RFC 5545 §3.3.11 text escaping. */
const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Lines longer than 75 octets are folded (RFC 5545 §3.1). */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsEvent = {
  uid: string;
  start: Date;
  minutes: number;
  title: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  status?: "CONFIRMED" | "CANCELLED";
  now?: Date;
};

export function icsFile(e: IcsEvent): string {
  const end = new Date(e.start.getTime() + e.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Appointments//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.status === "CANCELLED" ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${utc(e.now ?? new Date())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `STATUS:${e.status ?? "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
