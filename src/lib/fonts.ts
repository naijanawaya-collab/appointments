/**
 * Self-hosted fonts (no build-time calls to Google). Every curated display
 * font is declared once; each only downloads when a page actually uses it
 * (browsers fetch @font-face files lazily), so a storefront loads Geist plus
 * its one display font.
 */
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";

// Geist Mono only sets small labels (eyebrows), so it isn't preloaded: it
// stays off the critical path and swaps in when needed.
const geistMono = localFont({
  src: "../fonts/geist-mono-variable.woff2",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

const cormorant = localFont({
  src: [
    { path: "../fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500" },
    { path: "../fonts/cormorant-garamond-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  preload: false,
});

const barlowCondensed = localFont({
  src: [
    { path: "../fonts/barlow-condensed-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/barlow-condensed-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
  preload: false,
});

const italiana = localFont({
  src: "../fonts/italiana-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-italiana",
  display: "swap",
  preload: false,
});

const instrumentSerif = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: false,
});

const anton = localFont({
  src: "../fonts/anton-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-anton",
  display: "swap",
  preload: false,
});

export const fontVariables = [
  GeistSans.variable,
  geistMono.variable,
  cormorant.variable,
  barlowCondensed.variable,
  italiana.variable,
  instrumentSerif.variable,
  anton.variable,
].join(" ");
