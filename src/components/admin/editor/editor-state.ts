/**
 * Storefront editor logic that doesn't need React: steps, what kind of change
 * an edit is (theme vs structure), colour suggestions, list moves and the
 * "saved 2 min ago" label. Pure and unit-tested.
 */
import type { StorefrontConfig } from "@/domain/storefront/config";

export const STEPS = [
  { key: "preset", label: "Preset" },
  { key: "colours", label: "Colours" },
  { key: "font", label: "Font" },
  { key: "logo", label: "Logo" },
  { key: "hero", label: "Hero" },
  { key: "sections", label: "Sections" },
  { key: "content", label: "Content" },
  { key: "publish", label: "Publish" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export const stepIndex = (key: StepKey) => STEPS.findIndex((s) => s.key === key);

/** Fields that only change CSS variables: the preview can apply them without re-rendering. */
const THEME_FIELDS = ["preset", "mode", "accent", "secondary", "displayFont"] as const;

export type ThemeFields = Pick<StorefrontConfig, (typeof THEME_FIELDS)[number]>;

export function themeOf(config: StorefrontConfig): ThemeFields {
  return { preset: config.preset, mode: config.mode, accent: config.accent, secondary: config.secondary, displayFont: config.displayFont };
}

export function themeChanged(a: StorefrontConfig, b: StorefrontConfig): boolean {
  return THEME_FIELDS.some((k) => a[k] !== b[k]);
}

/** Anything beyond the theme changed (photos, sections, texts…): the preview must re-render. */
export function structureChanged(a: StorefrontConfig, b: StorefrontConfig): boolean {
  const strip = (c: StorefrontConfig) => {
    const rest: Partial<StorefrontConfig> = { ...c };
    for (const k of THEME_FIELDS) delete rest[k];
    // The preset's hero default lives in `hero`, so a preset switch counts as structural too.
    return JSON.stringify(rest);
  };
  return strip(a) !== strip(b);
}

export function sameConfig(a: StorefrontConfig, b: StorefrontConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Moves one item in an array (used by keyboard and drag reordering). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Adds ids, keeping order and dropping duplicates, up to `max`. */
export function addUnique(list: readonly string[], ids: readonly string[], max: number): string[] {
  const out = [...list];
  for (const id of ids) if (!out.includes(id) && out.length < max) out.push(id);
  return out;
}

/** Changing an announcement's text gives it a new id, so visitors who dismissed the old one see the new one. */
export function announcementId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `a${(h >>> 0).toString(36)}`;
}

export const HERO_MIN_WIDTH = 1600;

/** Photo quality hints shown next to hero photos (ED-4). */
export function heroQuality(width: number): { ok: boolean; message: string } {
  return width >= HERO_MIN_WIDTH
    ? { ok: true, message: "Sharp enough for the hero" }
    : { ok: false, message: `Looks soft as a hero (${width} px wide). Use one at least ${HERO_MIN_WIDTH} px wide, or keep it for the gallery.` };
}

/** "saved just now" / "saved 2 min ago" / "saved at 14:05" */
export function savedLabel(savedAt: Date | null, now: Date): string {
  if (!savedAt) return "Not saved yet";
  const secs = Math.max(0, Math.round((now.getTime() - savedAt.getTime()) / 1000));
  if (secs < 45) return "saved just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `saved ${mins} min ago`;
  return `saved at ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const HERO_SHORT = { split: "Split", full: "Full-bleed", carousel: "Carousel", text: "Text" } as const;
const MODE_SHORT = { light: "light", dark: "dark", auto: "auto" } as const;

/** One-line summary shown next to a finished step ("Preset · Classic"). */
export function stepSummary(
  key: StepKey,
  c: StorefrontConfig,
  names: { preset: (k: StorefrontConfig["preset"]) => string; font: (k: NonNullable<StorefrontConfig["displayFont"]> | null, preset: StorefrontConfig["preset"]) => string },
): string {
  switch (key) {
    case "preset":
      return names.preset(c.preset);
    case "colours":
      return `${c.accent.toUpperCase()} · ${MODE_SHORT[c.mode]}`;
    case "font":
      return names.font(c.displayFont, c.preset);
    case "logo":
      return c.logoMediaId ? "Logo" : "Monogram";
    case "hero":
      return HERO_SHORT[c.hero.layout];
    case "sections":
      return `${c.sections.filter((s) => s.visible).length} shown`;
    default:
      return "";
  }
}
