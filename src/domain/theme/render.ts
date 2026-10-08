/**
 * Turns a theme into the CSS the server renders into <head>, so the first
 * paint already has the right colours (no flash, no JS needed).
 *
 *   light → one :root block       dark → one :root block
 *   auto  → light :root block + @media (prefers-color-scheme: dark) block
 *
 * `html:root` beats the platform defaults in globals.css on specificity.
 */
import { deriveTokens, type ThemeInput, type TokenSet } from "./derive";
import type { Mode } from "./presets";

export type ThemeRender = {
  css: string;
  colorScheme: "light" | "dark" | "light dark";
  /** For <meta name="theme-color"> */
  themeColor: { light: string; dark: string };
  light: TokenSet;
  dark: TokenSet;
};

const block = (tokens: TokenSet) =>
  Object.entries(tokens)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");

export function renderTheme(input: ThemeInput & { mode: Mode }): ThemeRender {
  const light = deriveTokens(input, "light");
  const dark = deriveTokens(input, "dark");
  let css: string;
  if (input.mode === "light") {
    css = `html:root{${block(light)};color-scheme:light}`;
  } else if (input.mode === "dark") {
    css = `html:root{${block(dark)};color-scheme:dark}`;
  } else {
    css = `html:root{${block(light)};color-scheme:light dark}@media (prefers-color-scheme: dark){html:root{${block(dark)}}}`;
  }
  return {
    css,
    colorScheme: input.mode === "auto" ? "light dark" : input.mode,
    themeColor: { light: light["--background"], dark: dark["--background"] },
    light,
    dark,
  };
}

/** Tokens for the active scheme only, e.g. for emails (always light) or OG images. */
export function tokensFor(input: ThemeInput & { mode: Mode }, prefer: "light" | "dark" = "light") {
  const scheme = input.mode === "auto" ? prefer : input.mode;
  return deriveTokens(input, scheme);
}
