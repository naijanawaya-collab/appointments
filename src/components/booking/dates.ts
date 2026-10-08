/** Date helpers for the booking UI. Pure; always in the BUSINESS timezone, not the visitor's. */
import { localDateString, type Slot } from "@/domain/availability/compute-slots";

export type DayOption = {
  date: string; // YYYY-MM-DD
  weekday: string; // "Tue"
  dayOfMonth: string; // "6"
  month: string; // "Oct"
  isToday: boolean;
};

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function upcomingDates({
  now,
  timezone,
  count,
  locale,
}: {
  now: Date;
  timezone: string;
  count: number;
  locale: string;
}): DayOption[] {
  const today = localDateString(now, timezone);
  // Format calendar dates at UTC noon so the label is the date itself, in any zone.
  const fmt = (date: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return Array.from({ length: count }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      weekday: fmt(date, { weekday: "short" }),
      dayOfMonth: fmt(date, { day: "numeric" }),
      month: fmt(date, { month: "short" }),
      isToday: i === 0,
    };
  });
}

export function formatSlotTime(iso: string, timezone: string, locale = "de-AT") {
  return new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatLongDateTime(iso: string, timezone: string, locale = "de-AT") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type SlotGroup = { part: "Morning" | "Afternoon" | "Evening"; slots: Slot[] };

export function groupSlotsByPart(slots: Slot[], timezone: string): SlotGroup[] {
  const hourOf = (iso: string) =>
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  const groups: SlotGroup[] = [
    { part: "Morning", slots: [] },
    { part: "Afternoon", slots: [] },
    { part: "Evening", slots: [] },
  ];
  for (const slot of slots) {
    const h = hourOf(slot.start);
    groups[h < 12 ? 0 : h < 17 ? 1 : 2].slots.push(slot);
  }
  return groups.filter((g) => g.slots.length > 0);
}

/** Labels for a calendar date ("YYYY-MM-DD"), independent of any timezone. */
const onDate = (date: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** "October 2026" */
export const monthLabel = (date: string) => onDate(date, { month: "long", year: "numeric" });

/** "Sat 10 Oct" */
export const dayLabel = (date: string) =>
  `${onDate(date, { weekday: "short" })} ${onDate(date, { day: "numeric" })} ${onDate(date, { month: "short" })}`;
