import { describe, expect, it } from "vitest";
import { contrast, hexToOklch, isHex, mix, oklchToHex, parseHex, stepToContrast, toHex } from "./color";
import { accentReport, deriveTokens } from "./derive";
import { PRESET_KEYS, PRESETS, type PresetKey } from "./presets";
import { renderTheme } from "./render";

/** Designed palettes from docs/designs/tokens/tokens.css (golden values). */
const GOLDEN = {
  classic: {
    light: { "--background": "#f4ecdf", "--accent": "#8a6a2f", "--accent-text": "#745824", "--accent-hover": "#775b27", "--accent-foreground": "#ffffff" },
    dark: { "--background": "#1a1612", "--accent": "#c9a45c", "--accent-text": "#c9a45c", "--accent-foreground": "#1a1612" },
  },
  modern: {
    light: { "--background": "#f2f2f0", "--accent": "#ff5a1f", "--accent-text": "#b83d0c", "--accent-foreground": "#111111" },
    dark: { "--background": "#16171a", "--accent": "#ff5a1f", "--accent-text": "#ff7a4a", "--danger": "#ff6b6b" },
  },
  soft: {
    light: { "--background": "#faf3f1", "--accent": "#a3456b", "--btn-radius": "999px" },
    dark: { "--background": "#1c1418", "--accent": "#e58aae", "--accent-subtle": "#3a2129" },
  },
  editorial: {
    light: { "--background": "#f6f3ee", "--accent": "#a8431f", "--accent-foreground": "#fffdfa" },
    dark: { "--background": "#14120f", "--accent": "#e2805a" },
  },
} as const;

describe("colour maths", () => {
  it("round-trips hex ↔ OKLCH", () => {
    for (const hex of ["#8a6a2f", "#ff5a1f", "#000000", "#ffffff", "#a3456b", "#16171a"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrast("#ffffff", "#ffffff")).toBe(1);
  });

  it("validates and parses hex", () => {
    expect(isHex("#a1b2c3")).toBe(true);
    expect(isHex("#abc")).toBe(false);
    expect(isHex("red")).toBe(false);
    expect(isHex("#a1b2c3;}body{x")).toBe(false);
    expect(toHex(parseHex("#A1B2C3"))).toBe("#a1b2c3");
  });

  it("mixes like color-mix in oklab", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 1)).toBe("#000000");
  });

  it("steps lightness until a contrast target is met", () => {
    const r = stepToContrast("#c9a45c", "#f4ecdf", 4.5, "darker");
    expect(contrast(r.color, "#f4ecdf")).toBeGreaterThanOrEqual(4.5);
    expect(r.deltaL).toBeGreaterThan(0.15);
    expect(stepToContrast("#000000", "#ffffff", 4.5, "darker").deltaL).toBe(0);
  });
});

describe("presets keep the designer's palettes", () => {
  for (const [preset, modes] of Object.entries(GOLDEN)) {
    for (const [scheme, expected] of Object.entries(modes)) {
      it(`${preset} ${scheme}`, () => {
        const p = PRESETS[preset as PresetKey];
        const tokens = deriveTokens({ preset: preset as PresetKey, accent: p.defaultAccent }, scheme as "light" | "dark");
        expect(tokens).toMatchObject(expected);
      });
    }
  }
});

/** Pairs the TEST-PLAN contrast script checks. */
function assertAA(tokens: Record<string, string>, label: string) {
  const pairs: [string, string, number][] = [
    ["--foreground", "--background", 4.5],
    ["--muted", "--background", 4.5],
    ["--muted", "--surface", 4.5],
    ["--accent-text", "--background", 4.5],
    ["--accent-foreground", "--accent", 4.5],
  ];
  for (const [a, b, min] of pairs) {
    const ratio = contrast(tokens[a], tokens[b]);
    if (ratio < min) throw new Error(`${label}: ${a} on ${b} = ${ratio.toFixed(2)}`);
  }
}

/** Deterministic pseudo-random hex colours. */
function* randomColours(n: number, seed = 42) {
  let x = seed;
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    yield `#${(x & 0xffffff).toString(16).padStart(6, "0")}`;
  }
}

describe("every theme is AA-safe", () => {
  it("default accents of every preset, light and dark", () => {
    for (const key of PRESET_KEYS) {
      for (const scheme of ["light", "dark"] as const) {
        assertAA(deriveTokens({ preset: key, accent: PRESETS[key].defaultAccent }, scheme), `${key}/${scheme}`);
      }
    }
  });

  it("500 random owner accents × 6 presets × 2 schemes", () => {
    for (const accent of randomColours(500)) {
      for (const key of PRESET_KEYS) {
        for (const scheme of ["light", "dark"] as const) {
          assertAA(deriveTokens({ preset: key, accent }, scheme), `${key}/${scheme}/${accent}`);
        }
      }
    }
  });

  it("falls back to the preset accent when the stored accent is invalid", () => {
    const t = deriveTokens({ preset: "classic", accent: "javascript:alert(1)" }, "light");
    expect(t["--accent"]).toBe("#8a6a2f");
  });
});

describe("editor contrast report", () => {
  it("flags the designer's example: #C9A45C on cream needs a fix", () => {
    const r = accentReport({ preset: "classic", accent: "#c9a45c" });
    expect(r.needsFix).toBe(true);
    expect(contrast(r.suggestedAccent, "#f4ecdf")).toBeGreaterThanOrEqual(4.5);
    expect(r.light.accentForeground).toBe("#111111"); // buttons use dark text
  });

  it("does not flag an accent that already passes", () => {
    expect(accentReport({ preset: "classic", accent: "#5a4520" }).needsFix).toBe(false);
  });
});

describe("renderTheme", () => {
  it("renders a single block for light/dark and a media query for auto", () => {
    const light = renderTheme({ preset: "classic", accent: "#8a6a2f", mode: "light" });
    expect(light.css).toMatch(/^html:root\{--font-display:/);
    expect(light.css).not.toContain("@media");
    expect(light.colorScheme).toBe("light");

    const auto = renderTheme({ preset: "classic", accent: "#8a6a2f", mode: "auto" });
    expect(auto.css).toContain("@media (prefers-color-scheme: dark)");
    expect(auto.css).toContain("--background:#1a1612");
    expect(auto.themeColor).toEqual({ light: "#f4ecdf", dark: "#1a1612" });
  });

  it("uses the owner's display font override", () => {
    const t = renderTheme({ preset: "classic", accent: "#8a6a2f", mode: "light", displayFont: "anton" });
    expect(t.light["--font-display"]).toContain("--font-anton");
    expect(t.light["--display-transform"]).toBe("uppercase");
  });
});
