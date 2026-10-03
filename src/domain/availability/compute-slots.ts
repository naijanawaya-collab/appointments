/**
 * Pure slot computation. No database, no clock: everything comes in as
 * arguments, which makes it exhaustively unit-testable (incl. DST changes).
 *
 * Rules
 *  - Working hours are wall-clock times in the business timezone.
 *  - The services themselves must fit inside a working window.
 *  - The blocked time (services + cleanup buffers) must not overlap any busy
 *    interval (existing bookings, time off). Buffers may run past closing.
 *  - Slots start on a fixed grid from the window start (slotIntervalMin).
 *  - Nothing earlier than now + minLeadTimeMin, nothing beyond maxAdvanceDays.
 */
import { TZDate } from "@date-fns/tz";

export type TimeWindow = { start: string; end: string }; // "HH:MM" or "HH:MM:SS"
export type Interval = { start: Date; end: Date };

export type StaffAvailability = {
  staffId: string;
  windows: TimeWindow[];
  busy: Interval[];
};

export type ComputeSlotsInput = {
  /** Local calendar date in the business timezone, "YYYY-MM-DD". */
  date: string;
  timezone: string;
  now: Date;
  slotIntervalMin: number;
  minLeadTimeMin: number;
  maxAdvanceDays: number;
  /** Customer-facing duration (sum of services). Must fit in working hours. */
  serviceDurationMin: number;
  /** Duration + buffers. This is what gets blocked in the calendar. */
  blockDurationMin: number;
  staff: StaffAvailability[];
};

export type Slot = {
  /** ISO-8601 UTC instant, e.g. "2026-10-06T07:00:00.000Z" */
  start: string;
  /** Professionals free at this time, in input order. */
  staffIds: string[];
};

const MINUTE = 60_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalDate(date: string): { year: number; month: number; day: number } | null {
  const m = DATE_RE.exec(date);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** ISO weekday (1 = Monday ... 7 = Sunday) of a "YYYY-MM-DD" date. */
export function isoWeekday(date: string): number {
  const p = parseLocalDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  const dow = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Today's date ("YYYY-MM-DD") in the given timezone. */
export function localDateString(instant: Date, timezone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Whole days between two "YYYY-MM-DD" dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const pa = parseLocalDate(a)!;
  const pb = parseLocalDate(b)!;
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000,
  );
}

/** Converts a wall-clock time on a local date to a UTC instant (DST-aware). */
export function zonedDateTime(date: string, time: string, timezone: string): Date {
  const p = parseLocalDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  const [h, mi] = time.split(":").map(Number);
  return new Date(new TZDate(p.year, p.month - 1, p.day, h, mi, 0, 0, timezone).getTime());
}

/** UTC range [start, end) covering the whole local day. */
export function localDayRange(date: string, timezone: string): Interval {
  const p = parseLocalDate(date);
  if (!p) throw new Error(`Invalid date: ${date}`);
  const start = new TZDate(p.year, p.month - 1, p.day, 0, 0, 0, 0, timezone);
  const end = new TZDate(p.year, p.month - 1, p.day + 1, 0, 0, 0, 0, timezone);
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
}

const overlaps = (aStart: number, aEnd: number, b: Interval) =>
  aStart < b.end.getTime() && aEnd > b.start.getTime();

export function computeSlots(input: ComputeSlotsInput): Slot[] {
  const { date, timezone, now } = input;
  if (!parseLocalDate(date)) return [];
  if (input.serviceDurationMin <= 0 || input.slotIntervalMin <= 0) return [];

  const today = localDateString(now, timezone);
  const offset = daysBetween(today, date);
  if (offset < 0 || offset > input.maxAdvanceDays) return [];

  const earliest = now.getTime() + input.minLeadTimeMin * MINUTE;
  const serviceMs = input.serviceDurationMin * MINUTE;
  const blockMs = Math.max(input.blockDurationMin, input.serviceDurationMin) * MINUTE;
  const stepMs = input.slotIntervalMin * MINUTE;

  const byStart = new Map<number, string[]>();

  for (const member of input.staff) {
    for (const window of member.windows) {
      const windowStart = zonedDateTime(date, window.start, timezone).getTime();
      const windowEnd = zonedDateTime(date, window.end, timezone).getTime();

      for (let t = windowStart; t + serviceMs <= windowEnd; t += stepMs) {
        if (t < earliest) continue;
        if (member.busy.some((b) => overlaps(t, t + blockMs, b))) continue;
        const list = byStart.get(t);
        if (list) {
          if (!list.includes(member.staffId)) list.push(member.staffId);
        } else {
          byStart.set(t, [member.staffId]);
        }
      }
    }
  }

  return [...byStart.entries()]
    .sort(([a], [b]) => a - b)
    .map(([t, staffIds]) => ({ start: new Date(t).toISOString(), staffIds }));
}
