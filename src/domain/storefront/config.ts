/**
 * The storefront configuration document: everything about how a shop's page
 * looks, in one validated JSON object. Owners edit a draft; publishing copies
 * it to the published slot. Pure (no DB) so it's usable in client code too.
 */
import { z } from "zod";
import { DISPLAY_FONT_KEYS, type DisplayFontKey } from "@/domain/theme/fonts";
import { PRESETS, PRESET_KEYS, type PresetKey } from "@/domain/theme/presets";

export const SECTION_KEYS = ["about", "services", "team", "gallery", "reviews", "visit", "contact"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About",
  services: "Services & prices",
  team: "Team",
  gallery: "Gallery",
  reviews: "Reviews",
  visit: "Hours & location",
  contact: "Contact & socials",
};

export const HERO_LAYOUTS = ["split", "full", "carousel", "text"] as const;
export const MODES = ["light", "dark", "auto"] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #8A6A2F").transform((v) => v.toLowerCase());
const id = z.uuid();

export const announcementSchema = z.object({
  id: z.string().min(1).max(40),
  tag: z.string().trim().max(16).default(""),
  text: z.string().trim().min(1, "Write the announcement").max(140),
  until: z.iso.date().nullable().default(null),
});

export const storefrontConfigSchema = z.object({
  version: z.literal(1).default(1),
  preset: z.enum(PRESET_KEYS as [PresetKey, ...PresetKey[]]),
  mode: z.enum(MODES),
  accent: hex,
  secondary: hex.nullable().default(null),
  displayFont: z.enum(DISPLAY_FONT_KEYS as [DisplayFontKey, ...DisplayFontKey[]]).nullable().default(null),
  logoMediaId: id.nullable().default(null),
  hero: z.object({
    layout: z.enum(HERO_LAYOUTS),
    mediaIds: z.array(id).max(5).default([]),
  }),
  aboutMediaId: id.nullable().default(null),
  gallery: z.array(id).max(60).default([]),
  sections: z
    .array(z.object({ key: z.enum(SECTION_KEYS), visible: z.boolean() }))
    .refine((s) => new Set(s.map((x) => x.key)).size === s.length, "Each section can appear once"),
  announcement: announcementSchema.nullable().default(null),
  serviceImages: z.boolean().default(false),
  seo: z
    .object({
      title: z.string().trim().max(60).default(""),
      description: z.string().trim().max(160).default(""),
    })
    .default({ title: "", description: "" }),
});

export type StorefrontConfig = z.output<typeof storefrontConfigSchema>;
export type StorefrontConfigInput = z.input<typeof storefrontConfigSchema>;

export function defaultConfig(preset: PresetKey = "classic"): StorefrontConfig {
  const p = PRESETS[preset];
  return storefrontConfigSchema.parse({
    preset,
    mode: p.defaultMode,
    accent: p.defaultAccent,
    hero: { layout: p.defaultHero, mediaIds: [] },
    sections: SECTION_KEYS.map((key) => ({ key, visible: true })),
  });
}

/**
 * Parse stored JSON defensively: unknown/invalid documents fall back to
 * defaults, and any section missing from an older document is appended
 * (hidden) so new section types never break existing shops.
 */
export function parseConfig(raw: unknown, fallbackPreset: PresetKey = "classic"): StorefrontConfig {
  const parsed = storefrontConfigSchema.safeParse(raw);
  const config = parsed.success ? parsed.data : defaultConfig(fallbackPreset);
  const present = new Set(config.sections.map((s) => s.key));
  const missing = SECTION_KEYS.filter((k) => !present.has(k)).map((key) => ({ key, visible: false }));
  return missing.length ? { ...config, sections: [...config.sections, ...missing] } : config;
}

/** Switching preset adopts its accent/mode/hero defaults but keeps content choices. */
export function applyPreset(config: StorefrontConfig, preset: PresetKey): StorefrontConfig {
  const p = PRESETS[preset];
  return { ...config, preset, accent: p.defaultAccent, mode: p.defaultMode, displayFont: null, hero: { ...config.hero, layout: p.defaultHero } };
}

/** Effective hero layout given the photos available (design fallbacks S-10, edge case 9). */
export function effectiveHeroLayout(layout: StorefrontConfig["hero"]["layout"], photoCount: number) {
  if (photoCount === 0) return "text" as const;
  if (layout === "carousel" && photoCount < 3) return "split" as const;
  return layout;
}

/** Problems that block publishing (shown in the editor's publish step). */
export function publishIssues(config: StorefrontConfig, altByMediaId: Map<string, string>): string[] {
  const issues: string[] = [];
  const used = [...config.hero.mediaIds, ...config.gallery, ...(config.aboutMediaId ? [config.aboutMediaId] : [])];
  const missingAlt = used.filter((m) => !altByMediaId.get(m)?.trim());
  if (missingAlt.length) issues.push(`${missingAlt.length} photo${missingAlt.length > 1 ? "s need" : " needs"} a description (alt text).`);
  if (config.hero.layout === "carousel" && config.hero.mediaIds.length < 3) {
    issues.push("The carousel hero needs at least 3 photos.");
  }
  return issues;
}
