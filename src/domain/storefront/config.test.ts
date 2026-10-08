import { describe, expect, it } from "vitest";
import {
  applyPreset,
  defaultConfig,
  effectiveHeroLayout,
  parseConfig,
  publishIssues,
  SECTION_KEYS,
  storefrontConfigSchema,
} from "./config";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("storefront config", () => {
  it("builds valid defaults from a preset", () => {
    const c = defaultConfig("modern");
    expect(c).toMatchObject({ preset: "modern", mode: "dark", accent: "#ff5a1f", hero: { layout: "full" } });
    expect(c.sections.map((s) => s.key)).toEqual([...SECTION_KEYS]);
    expect(storefrontConfigSchema.safeParse(c).success).toBe(true);
  });

  it("rejects colours that could inject CSS", () => {
    const bad = { ...defaultConfig(), accent: "#fff;}body{display:none" };
    expect(storefrontConfigSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects duplicate sections and unknown presets", () => {
    const c = defaultConfig();
    expect(storefrontConfigSchema.safeParse({ ...c, sections: [...c.sections, c.sections[0]] }).success).toBe(false);
    expect(storefrontConfigSchema.safeParse({ ...c, preset: "neon" }).success).toBe(false);
  });

  it("parses stored JSON defensively and appends new sections hidden", () => {
    expect(parseConfig({ junk: true }, "soft").preset).toBe("soft");
    const old = { ...defaultConfig(), sections: [{ key: "services", visible: true }] };
    const parsed = parseConfig(old);
    expect(parsed.sections[0]).toEqual({ key: "services", visible: true });
    expect(parsed.sections).toHaveLength(SECTION_KEYS.length);
    expect(parsed.sections.slice(1).every((s) => !s.visible)).toBe(true);
  });

  it("switching preset adopts its defaults but keeps photos and sections", () => {
    const c = { ...defaultConfig("classic"), gallery: [uuid(1)], hero: { layout: "split" as const, mediaIds: [uuid(2)] } };
    const next = applyPreset(c, "soft");
    expect(next).toMatchObject({ preset: "soft", accent: "#a3456b", gallery: [uuid(1)], hero: { mediaIds: [uuid(2)] } });
  });

  it("falls back to sensible hero layouts", () => {
    expect(effectiveHeroLayout("carousel", 2)).toBe("split");
    expect(effectiveHeroLayout("carousel", 3)).toBe("carousel");
    expect(effectiveHeroLayout("full", 0)).toBe("text");
  });

  it("lists publish blockers", () => {
    const c = { ...defaultConfig(), hero: { layout: "carousel" as const, mediaIds: [uuid(1)] }, gallery: [uuid(2)] };
    const issues = publishIssues(c, new Map([[uuid(1), "A chair"], [uuid(2), " "]]));
    expect(issues).toEqual(["1 photo needs a description (alt text).", "The carousel hero needs at least 3 photos."]);
  });
});
