/**
 * Curated display fonts (Design System §05). Body text is always Geist.
 * Pure metadata – the actual @font-face loading lives in src/lib/fonts.ts.
 */

export const DISPLAY_FONTS = {
  "instrument-serif": {
    label: "Instrument Serif",
    family: "var(--font-instrument-serif), Georgia, serif",
    weight: "400",
    transform: "none",
    tracking: "-0.01em",
  },
  cormorant: {
    label: "Cormorant Garamond",
    family: "var(--font-cormorant), Georgia, serif",
    weight: "600",
    transform: "none",
    tracking: "-0.01em",
  },
  "barlow-condensed": {
    label: "Barlow Condensed",
    family: "var(--font-barlow-condensed), 'Arial Narrow', sans-serif",
    weight: "700",
    transform: "uppercase",
    tracking: "0.01em",
  },
  geist: {
    label: "Geist",
    family: "var(--font-geist-sans), system-ui, sans-serif",
    weight: "600",
    transform: "none",
    tracking: "-0.03em",
  },
  anton: {
    label: "Anton",
    family: "var(--font-anton), Impact, sans-serif",
    weight: "400",
    transform: "uppercase",
    tracking: "0.01em",
  },
  italiana: {
    label: "Italiana",
    family: "var(--font-italiana), Didot, serif",
    weight: "400",
    transform: "none",
    tracking: "0.02em",
  },
} as const;

export type DisplayFontKey = keyof typeof DISPLAY_FONTS;
export const DISPLAY_FONT_KEYS = Object.keys(DISPLAY_FONTS) as DisplayFontKey[];

/** Email-safe stacks (no web fonts in email). */
export const EMAIL_FONTS = {
  display: "Georgia, 'Times New Roman', serif",
  body: "Helvetica, Arial, sans-serif",
} as const;
