/**
 * Theme presets (Design System §03). A preset = display font + shape +
 * neutral palettes + defaults (accent, mode, hero, motion). Owners start from
 * one and can change the accent, mode and font.
 *
 * For the four presets the designer hand-tuned (editorial = platform,
 * classic = Kaiser, modern = FADE/LAB, soft = Lune) the full designed palettes
 * are kept: when an owner keeps the preset's accent, they get exactly the
 * designed colours. Any other accent goes through derive.ts.
 */
import type { DisplayFontKey } from "./fonts";

export type Mode = "light" | "dark" | "auto";
export type HeroLayout = "split" | "full" | "carousel" | "text";
export type MotionLevel = "calm" | "standard" | "lively";

export type Neutrals = {
  background: string;
  foreground: string;
  surface: string;
  muted: string;
  line: string;
  danger: string;
  success: string;
};

export type AccentSet = {
  accent: string;
  accentForeground: string;
  accentHover: string;
  accentPressed: string;
  accentSubtle: string;
  accentText: string;
};

export type PresetKey = "editorial" | "classic" | "modern" | "minimal" | "bold" | "soft";

export type Preset = {
  key: PresetKey;
  label: string;
  description: string;
  font: DisplayFontKey;
  radius: string;
  radiusLg: string;
  btnRadius: string;
  btnTransform: "none" | "uppercase";
  defaultMode: Exclude<Mode, "auto">;
  defaultHero: HeroLayout;
  motion: MotionLevel;
  /** The accent owners start with (light-mode value). */
  defaultAccent: string;
  neutrals: { light: Neutrals; dark: Neutrals };
  /** Hand-tuned accent sets used when the owner keeps `defaultAccent`. */
  designed?: { light: AccentSet; dark: AccentSet };
};

const DANGER_SUCCESS_LIGHT = { danger: "#b42318", success: "#2f6b3a" };
const DANGER_SUCCESS_DARK = { danger: "#f97066", success: "#7fc48c" };

export const PRESETS: Record<PresetKey, Preset> = {
  editorial: {
    key: "editorial",
    label: "Editorial",
    description: "Instrument Serif + Geist · radius 10 · standard motion",
    font: "instrument-serif",
    radius: "10px",
    radiusLg: "14px",
    btnRadius: "10px",
    btnTransform: "none",
    defaultMode: "light",
    defaultHero: "split",
    motion: "standard",
    defaultAccent: "#a8431f",
    neutrals: {
      light: { background: "#f6f3ee", foreground: "#1d1a17", surface: "#fffdfa", muted: "#6b6259", line: "#e3dcd1", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#14120f", foreground: "#f1ece4", surface: "#1d1a16", muted: "#a59c90", line: "#332d27", ...DANGER_SUCCESS_DARK },
    },
    designed: {
      light: { accent: "#a8431f", accentForeground: "#fffdfa", accentHover: "#923a1b", accentPressed: "#7c3117", accentSubtle: "#f3e3da", accentText: "#a8431f" },
      dark: { accent: "#e2805a", accentForeground: "#14120f", accentHover: "#e9956f", accentPressed: "#d26d47", accentSubtle: "#33231b", accentText: "#e2805a" },
    },
  },
  classic: {
    key: "classic",
    label: "Classic",
    description: "Cormorant Garamond · brass accent · radius 2 · split hero",
    font: "cormorant",
    radius: "2px",
    radiusLg: "4px",
    btnRadius: "2px",
    btnTransform: "none",
    defaultMode: "light",
    defaultHero: "split",
    motion: "standard",
    defaultAccent: "#8a6a2f",
    neutrals: {
      light: { background: "#f4ecdf", foreground: "#2a2118", surface: "#fbf6ee", muted: "#6e604e", line: "#e2d6c3", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#1a1612", foreground: "#f1e8da", surface: "#231e18", muted: "#ab9f8c", line: "#3a3128", ...DANGER_SUCCESS_DARK },
    },
    designed: {
      light: { accent: "#8a6a2f", accentForeground: "#ffffff", accentHover: "#775b27", accentPressed: "#644c20", accentSubtle: "#ece0cb", accentText: "#745824" },
      dark: { accent: "#c9a45c", accentForeground: "#1a1612", accentHover: "#d6b573", accentPressed: "#b8924a", accentSubtle: "#2f271b", accentText: "#c9a45c" },
    },
  },
  modern: {
    key: "modern",
    label: "Modern",
    description: "Barlow Condensed · signal accent · radius 0 · full-bleed hero",
    font: "barlow-condensed",
    radius: "0px",
    radiusLg: "0px",
    btnRadius: "0px",
    btnTransform: "uppercase",
    defaultMode: "dark",
    defaultHero: "full",
    motion: "lively",
    defaultAccent: "#ff5a1f",
    neutrals: {
      light: { background: "#f2f2f0", foreground: "#16171a", surface: "#ffffff", muted: "#5f6066", line: "#dcdcd8", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#16171a", foreground: "#f3f3f1", surface: "#1f2024", muted: "#a3a4a8", line: "#303136", danger: "#ff6b6b", success: "#6fd08c" },
    },
    designed: {
      light: { accent: "#ff5a1f", accentForeground: "#111111", accentHover: "#ff7444", accentPressed: "#e8480f", accentSubtle: "#ffe6dc", accentText: "#b83d0c" },
      dark: { accent: "#ff5a1f", accentForeground: "#111111", accentHover: "#ff7444", accentPressed: "#e8480f", accentSubtle: "#2c1d17", accentText: "#ff7a4a" },
    },
  },
  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "Geist only (zero extra font bytes) · monochrome · radius 6 · calm motion",
    font: "geist",
    radius: "6px",
    radiusLg: "8px",
    btnRadius: "6px",
    btnTransform: "none",
    defaultMode: "light",
    defaultHero: "text",
    motion: "calm",
    defaultAccent: "#18181b",
    neutrals: {
      light: { background: "#fafafa", foreground: "#111113", surface: "#ffffff", muted: "#5e5e66", line: "#e4e4e7", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#0f0f11", foreground: "#f4f4f5", surface: "#18181b", muted: "#a1a1aa", line: "#2a2a2f", ...DANGER_SUCCESS_DARK },
    },
    designed: {
      light: { accent: "#18181b", accentForeground: "#ffffff", accentHover: "#2c2c31", accentPressed: "#3f3f46", accentSubtle: "#ececee", accentText: "#18181b" },
      dark: { accent: "#f4f4f5", accentForeground: "#0f0f11", accentHover: "#e4e4e7", accentPressed: "#d4d4d8", accentSubtle: "#232327", accentText: "#f4f4f5" },
    },
  },
  bold: {
    key: "bold",
    label: "Bold",
    description: "Anton · high-contrast acid accent · radius 0 · carousel, big photos",
    font: "anton",
    radius: "0px",
    radiusLg: "0px",
    btnRadius: "0px",
    btnTransform: "uppercase",
    defaultMode: "dark",
    defaultHero: "carousel",
    motion: "lively",
    defaultAccent: "#d4ff3a",
    neutrals: {
      light: { background: "#f4f4f0", foreground: "#0b0b0c", surface: "#ffffff", muted: "#57574f", line: "#dcdcd4", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#0b0b0c", foreground: "#f5f5f0", surface: "#161618", muted: "#a3a39c", line: "#2a2a2c", ...DANGER_SUCCESS_DARK },
    },
  },
  soft: {
    key: "soft",
    label: "Soft",
    description: "Italiana · rose accent · radius 20 / pill buttons · standard motion",
    font: "italiana",
    radius: "20px",
    radiusLg: "20px",
    btnRadius: "999px",
    btnTransform: "none",
    defaultMode: "light",
    defaultHero: "split",
    motion: "standard",
    defaultAccent: "#a3456b",
    neutrals: {
      light: { background: "#faf3f1", foreground: "#3b2430", surface: "#fffaf8", muted: "#7a5d69", line: "#eedcd8", ...DANGER_SUCCESS_LIGHT },
      dark: { background: "#1c1418", foreground: "#f6e9ec", surface: "#261c21", muted: "#b89ca6", line: "#3b2c33", ...DANGER_SUCCESS_DARK },
    },
    designed: {
      light: { accent: "#a3456b", accentForeground: "#ffffff", accentHover: "#8f3a5d", accentPressed: "#7b3050", accentSubtle: "#f4e1e6", accentText: "#a3456b" },
      dark: { accent: "#e58aae", accentForeground: "#1c1418", accentHover: "#eda2bf", accentPressed: "#d9739c", accentSubtle: "#3a2129", accentText: "#e58aae" },
    },
  },
};

export const PRESET_KEYS = Object.keys(PRESETS) as PresetKey[];

/** Suggested accents shown in the editor per preset. */
export const ACCENT_SUGGESTIONS: Record<PresetKey, string[]> = {
  editorial: ["#a8431f", "#1f4e79", "#2f6b3a", "#6b3fa0", "#1d1a17"],
  classic: ["#8a6a2f", "#2f4a3a", "#7a2e2e", "#1f3a5f", "#2a2118"],
  modern: ["#ff5a1f", "#2563eb", "#16a34a", "#e11d48", "#f5f5f0"],
  minimal: ["#18181b", "#2563eb", "#0f766e", "#b45309", "#7c3aed"],
  bold: ["#d4ff3a", "#ff3d7f", "#00e5ff", "#ffb300", "#ffffff"],
  soft: ["#a3456b", "#8b5e83", "#b26b4d", "#5f7a6a", "#3b2430"],
};
