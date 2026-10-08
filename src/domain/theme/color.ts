/**
 * Colour maths for the theme engine: hex ↔ sRGB ↔ OKLab/OKLCH, WCAG 2.1
 * contrast, and the small set of operations the design system needs
 * (lightness steps, mixing). No dependencies; all pure.
 */

export type RGB = { r: number; g: number; b: number }; // 0..1, gamma-encoded sRGB
export type OKLCH = { l: number; c: number; h: number };

const HEX_RE = /^#([0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX_RE.test(value);
}

export function parseHex(hex: string): RGB {
  const m = HEX_RE.exec(hex.trim());
  if (!m) throw new Error(`Invalid colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function toHex({ r, g, b }: RGB): string {
  const h = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio (1–21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function hexToOklch(hex: string): OKLCH {
  const { r, g, b } = parseHex(hex);
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180) / Math.PI };
}

function oklabToRgb(L: number, A: number, B: number): RGB {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

const inGamut = ({ r, g, b }: RGB) => [r, g, b].every((x) => x >= -1e-4 && x <= 1 + 1e-4);

/** OKLCH → hex, reducing chroma until the colour fits in sRGB (keeps hue + lightness). */
export function oklchToHex({ l, c, h }: OKLCH): string {
  const L = clamp01(l);
  const rad = (h * Math.PI) / 180;
  let chroma = c;
  for (let i = 0; i < 40; i++) {
    const rgb = oklabToRgb(L, chroma * Math.cos(rad), chroma * Math.sin(rad));
    if (inGamut(rgb)) return toHex(rgb);
    chroma *= 0.9;
  }
  return toHex(oklabToRgb(L, 0, 0));
}

/** Shift OKLCH lightness by `delta` (e.g. −0.06 for a hover state on light themes). */
export function shiftLightness(hex: string, delta: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, l: c.l + delta });
}

/** Mix `amount` (0..1) of `a` into `b` in OKLab, like CSS color-mix(in oklab, a x%, b). */
export function mix(a: string, b: string, amount: number): string {
  const ca = hexToOklch(a);
  const cb = hexToOklch(b);
  const toLab = (c: OKLCH) => {
    const rad = (c.h * Math.PI) / 180;
    return [c.l, c.c * Math.cos(rad), c.c * Math.sin(rad)];
  };
  const [la, aa, ba] = toLab(ca);
  const [lb, ab, bb] = toLab(cb);
  const t = clamp01(amount);
  return toHex(oklabToRgb(lb + (la - lb) * t, ab + (aa - ab) * t, bb + (ba - bb) * t));
}

/**
 * Step `hex` in OKLCH lightness (0.02 per step, up to 40 steps) towards
 * darker or lighter until it reaches `target` contrast against `against`.
 * Returns the colour and how far lightness moved.
 */
export function stepToContrast(
  hex: string,
  against: string,
  target: number,
  direction: "darker" | "lighter",
): { color: string; deltaL: number } {
  if (contrast(hex, against) >= target) return { color: hex, deltaL: 0 };
  const start = hexToOklch(hex);
  const sign = direction === "darker" ? -1 : 1;
  for (let i = 1; i <= 40; i++) {
    const candidate = oklchToHex({ ...start, l: start.l + sign * 0.02 * i });
    if (contrast(candidate, against) >= target) return { color: candidate, deltaL: 0.02 * i };
  }
  const extreme = direction === "darker" ? "#000000" : "#ffffff";
  return { color: extreme, deltaL: 0.8 };
}

/** Black-ish or white-ish text, whichever contrasts more with `background`. */
export function bestTextOn(background: string, dark = "#111111", light = "#ffffff"): string {
  return contrast(dark, background) >= contrast(light, background) ? dark : light;
}
