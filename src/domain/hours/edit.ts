/**
 * Editing weekly hours (shop opening hours and each professional's working
 * hours share the same editor and rules). Pure.
 */
import { WEEKDAY_LABELS } from "./hours";

export type HoursRange = { weekday: number; startTime: string; endTime: string };

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Problems with a week of ranges, keyed "weekday.index" so the editor can put
 * the message next to the right row. Empty object = valid.
 */
export function hoursIssues(ranges: HoursRange[]): Record<string, string> {
  const issues: Record<string, string> = {};
  for (let weekday = 1; weekday <= 7; weekday++) {
    const day = ranges
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.weekday === weekday);
    day.forEach((r, n) => {
      const key = `${weekday}.${n}`;
      if (!TIME_RE.test(r.startTime) || !TIME_RE.test(r.endTime)) issues[key] = "Use HH:MM, e.g. 09:00";
      else if (toMinutes(r.endTime) <= toMinutes(r.startTime)) issues[key] = "The end must be after the start";
    });
    const sorted = day
      .map((r, n) => ({ ...r, n }))
      .filter((r) => TIME_RE.test(r.startTime) && TIME_RE.test(r.endTime))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let k = 1; k < sorted.length; k++) {
      if (toMinutes(sorted[k].startTime) < toMinutes(sorted[k - 1].endTime)) {
        issues[`${weekday}.${sorted[k].n}`] ??= `Overlaps ${sorted[k - 1].startTime}–${sorted[k - 1].endTime} on ${WEEKDAY_LABELS[weekday - 1]}`;
      }
    }
  }
  return issues;
}

/** Normalises "9:00" → "09:00" and sorts by weekday, then start. */
export function normaliseRanges(ranges: HoursRange[]): HoursRange[] {
  const pad = (t: string) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : t.trim();
  };
  return ranges
    .map((r) => ({ weekday: r.weekday, startTime: pad(r.startTime), endTime: pad(r.endTime) }))
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}
