/**
 * From one owner colour to a full, AA-safe palette (Design System §04).
 *
 *  --accent-foreground  black or white, whichever contrasts more with --accent
 *                       (one of them always reaches ≥ 4.58:1)
 *  --accent-text        accent stepped in OKLCH lightness (0.02/step) until it
 *                       reaches 4.5:1 on --background; hue + chroma kept
 *  --accent-hover/-pressed   L ∓ 0.06 / ∓ 0.12 (dark themes: + 0.06 / + 0.10)
 *  --accent-subtle      12 % accent mixed into the background
 *  Dark mode            same accent, re-checked on the dark background; lightened
 *                       until it is at least 3:1 (non-text UI contrast)
 *  needsFix             accent-text had to move > 0.15 in lightness → editor warns
 */
import { bestTextOn, contrast, isHex, mix, shiftLightness, stepToContrast } from "./color";
import { DISPLAY_FONTS, type DisplayFontKey } from "./fonts";
import { PRESETS, type AccentSet, type Neutrals, type PresetKey } from "./presets";

export type ThemeInput = {
  preset: PresetKey;
  accent: string;
  secondary?: string | null;
  displayFont?: DisplayFontKey | null;
};

export type TokenSet = Record<`--${string}`, string>;

export type DerivedAccent = AccentSet & {
  /** How far --accent-text moved in OKLCH lightness to reach AA. */
  textShift: number;
  needsFix: boolean;
};

export const FIX_THRESHOLD = 0.15;

export function deriveAccent(accentHex: string, neutrals: Neutrals, scheme: "light" | "dark"): DerivedAccent {
  const background = neutrals.background;
  let accent = accentHex.toLowerCase();

  if (scheme === "dark") {
    accent = stepToContrast(accent, background, 3, "lighter").color;
  }

  // Prefer the theme's soft black, but fall back to pure black/white when a
  // mid-tone accent would otherwise land just under 4.5:1.
  let accentForeground = bestTextOn(accent, scheme === "dark" ? background : "#111111", "#ffffff");
  if (contrast(accentForeground, accent) < 4.5) accentForeground = bestTextOn(accent, "#000000", "#ffffff");
  const text = stepToContrast(accent, background, 4.5, scheme === "light" ? "darker" : "lighter");

  const hoverDelta = scheme === "light" ? -0.06 : 0.06;
  const pressedDelta = scheme === "light" ? -0.12 : 0.1;

  return {
    accent,
    accentForeground,
    accentHover: shiftLightness(accent, hoverDelta),
    accentPressed: shiftLightness(accent, pressedDelta),
    accentSubtle: mix(accent, background, 0.12),
    accentText: text.color,
    textShift: text.deltaL,
    needsFix: text.deltaL > FIX_THRESHOLD,
  };
}

/** Full token set for one colour scheme. */
export function deriveTokens(input: ThemeInput, scheme: "light" | "dark"): TokenSet {
  const preset = PRESETS[input.preset];
  const neutrals = preset.neutrals[scheme];
  const accentHex = isHex(input.accent) ? input.accent.toLowerCase() : preset.defaultAccent;
  const designed = preset.designed;

  const accentSet: AccentSet =
    designed && accentHex === preset.defaultAccent ? designed[scheme] : deriveAccent(accentHex, neutrals, scheme);

  const font = DISPLAY_FONTS[input.displayFont ?? preset.font];

  return {
    "--font-display": font.family,
    "--display-weight": font.weight,
    "--display-transform": font.transform,
    "--display-tracking": font.tracking,
    "--radius": preset.radius,
    "--radius-lg": preset.radiusLg,
    "--btn-radius": preset.btnRadius,
    "--btn-transform": preset.btnTransform,
    "--background": neutrals.background,
    "--foreground": neutrals.foreground,
    "--surface": neutrals.surface,
    "--muted": neutrals.muted,
    "--line": neutrals.line,
    "--accent": accentSet.accent,
    "--accent-foreground": accentSet.accentForeground,
    "--accent-hover": accentSet.accentHover,
    "--accent-pressed": accentSet.accentPressed,
    "--accent-subtle": accentSet.accentSubtle,
    "--accent-text": accentSet.accentText,
    "--secondary": input.secondary && isHex(input.secondary) ? input.secondary.toLowerCase() : neutrals.foreground,
    "--danger": neutrals.danger,
    "--success": neutrals.success,
  };
}

/** What the editor's colour step shows: ratios, whether a fix is advised, and the fix. */
export function accentReport(input: ThemeInput) {
  const preset = PRESETS[input.preset];
  const light = deriveAccent(input.accent, preset.neutrals.light, "light");
  return {
    light,
    dark: deriveAccent(input.accent, preset.neutrals.dark, "dark"),
    needsFix: light.needsFix,
    suggestedAccent: light.accentText,
  };
}
