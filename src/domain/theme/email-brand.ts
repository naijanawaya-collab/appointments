/**
 * Brand colour for emails (E-3): emails can't use CSS variables, so the
 * shop accent is resolved to one hex that is AA-safe (≥ 4.5:1) with white
 * text on it – darkened in OKLCH when the owner's colour is too light.
 */
import { contrast, stepToContrast } from "./color";
import { tokensFor } from "./render";
import type { ThemeInput } from "./derive";
import type { Mode } from "./presets";

export function emailBrandColor(theme: ThemeInput & { mode: Mode }): string {
  const accent = tokensFor(theme, "light")["--accent"];
  return contrast(accent, "#ffffff") >= 4.5 ? accent : stepToContrast(accent, "#ffffff", 4.5, "darker").color;
}
