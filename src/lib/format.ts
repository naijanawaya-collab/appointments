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
