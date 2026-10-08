/**
 * Opening hours, closures and "Open now" status. Pure; everything is computed
 * in the shop's timezone regardless of the server's or visitor's clock.
 */
import { isoWeekday, localDateString } from "@/domain/availability/compute-slots";

export type OpeningRow = { weekday: number; startTime: string; endTime: string };
export type Closure = { startsOn: string; endsOn: string; label?: string | null };
export type DayHours = { weekday: number; label: string; ranges: [string, string][] };

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const hhmm = (t: string) => t.slice(0, 5);
const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Mon…Sun with sorted ranges ("09:00"–"13:00"). Days without rows have no ranges (closed). */
export function weeklyHours(rows: OpeningRow[]): DayHours[] {
  return WEEKDAY_LABELS.map((label, i) => ({
    weekday: i + 1,
    label,
    ranges: rows
      .filter((r) => r.weekday === i + 1)
      .map((r) => [hhmm(r.startTime), hhmm(r.endTime)] as [string, string])
      .sort((a, b) => a[0].localeCompare(b[0])),
  }));
}

export function formatRanges(ranges: [string, string][]): string {
  return ranges.length ? ranges.map(([a, b]) => `${a}–${b}`).join(" · ") : "Closed";
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function isClosureDay(date: string, closures: Closure[]): boolean {
  return closures.some((c) => date >= c.startsOn && date <= c.endsOn);
}

/** Local wall-clock minutes since midnight. */
function localMinutes(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export type OpenStatus =
  | { open: true; closesAt: string }
  | { open: false; opensAt: { sameDay: boolean; label: string } | null };

/**
 * "Open now until 13:00" / "Closed · opens 14:00" / "Closed · opens Tue 09:00".
 * Scans forward up to 14 days (closures can span a week).
 */
export function openStatus(now: Date, timezone: string, rows: OpeningRow[], closures: Closure[] = []): OpenStatus {
  const week = weeklyHours(rows);
  const today = localDateString(now, timezone);
  const nowMin = localMinutes(now, timezone);

  for (let offset = 0; offset < 14; offset++) {
    const date = addDays(today, offset);
    if (isClosureDay(date, closures)) continue;
    const day = week[isoWeekday(date) - 1];
    for (const [start, end] of day.ranges) {
      if (offset === 0 && nowMin >= minutes(start) && nowMin < minutes(end)) return { open: true, closesAt: end };
      if (offset > 0 || nowMin < minutes(start)) {
        return { open: false, opensAt: { sameDay: offset === 0, label: offset === 0 ? start : `${day.label} ${start}` } };
      }
    }
  }
  return { open: false, opensAt: null };
}

export function openStatusText(status: OpenStatus): { strong: string; rest: string } {
  if (status.open) return { strong: "Open now", rest: `until ${status.closesAt}` };
  return { strong: "Closed", rest: status.opensAt ? `· opens ${status.opensAt.label}` : "" };
}

const MONTH = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const DAY = (d: string) => String(Number(d.slice(8, 10)));

function formatClosureRange(c: Closure): string {
  if (c.startsOn === c.endsOn) return `${DAY(c.startsOn)} ${MONTH(c.startsOn)}`;
  if (c.startsOn.slice(0, 7) === c.endsOn.slice(0, 7)) return `${DAY(c.startsOn)}–${DAY(c.endsOn)} ${MONTH(c.endsOn)}`;
  return `${DAY(c.startsOn)} ${MONTH(c.startsOn)}–${DAY(c.endsOn)} ${MONTH(c.endsOn)}`;
}

/** "closed 24–26 Dec and 1 Jan." when a closure starts within `withinDays`; otherwise null (S-20). */
export function holidayNotice(now: Date, timezone: string, closures: Closure[], withinDays = 30): string | null {
  const today = localDateString(now, timezone);
  const horizon = addDays(today, withinDays);
  const upcoming = closures
    .filter((c) => c.endsOn >= today && c.startsOn <= horizon)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  if (!upcoming.length) return null;
  const parts = upcoming.map(formatClosureRange);
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
  return `closed ${list}.`;
}

/** Days that are closed for booking (no opening hours, or a closure). */
export function closedDates(from: string, count: number, rows: OpeningRow[], closures: Closure[]): Set<string> {
  const week = weeklyHours(rows);
  const closed = new Set<string>();
  for (let i = 0; i < count; i++) {
    const date = addDays(from, i);
    if (isClosureDay(date, closures) || week[isoWeekday(date) - 1].ranges.length === 0) closed.add(date);
  }
  return closed;
}

export { addDays as addLocalDays };
