/** Formatting helpers shared by server and client components. */

/**
 * Language of the UI text. Dates/times use it so they match the copy
 * ("Tuesday 6 October", not "Dienstag" next to English labels). Money keeps
 * the shop's own locale. When adding German, move this to an i18n setup
 * (e.g. next-intl) and derive it from the visitor or the shop.
 */
export const UI_LOCALE = "en-GB";

export function formatMoney(cents: number, currency: string, locale = "de-AT") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function parts(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat(UI_LOCALE, { timeZone, ...opts }).formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<Intl.DateTimeFormatPartTypes, string>;
}

/** "10:30" in the shop's timezone. */
export function clockTime(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}`;
}

/** "Friday 9 October 2026" (design copy: no comma). */
export function longDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** "Fri 9 Oct" */
export function shortDate(date: Date, timeZone: string): string {
  const p = parts(date, timeZone, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "Thursday" / "8 October" for a local "YYYY-MM-DD" (admin day header). */
export function dayHeading(date: string): { weekday: string; dayMonth: string } {
  const d = new Date(`${date}T12:00:00Z`);
  const p = parts(d, "UTC", { weekday: "long", day: "numeric", month: "long" });
  return { weekday: p.weekday, dayMonth: `${p.day} ${p.month}` };
}

/** "Europe/Vienna" → "Vienna time" */
export const zoneLabel = (timeZone: string) => `${(timeZone.split("/").pop() ?? timeZone).replaceAll("_", " ")} time`;
