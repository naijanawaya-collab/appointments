import { describe, expect, it } from "vitest";
import { defaultConfig, withoutMedia } from "@/domain/storefront/config";
import { isPreviewMessage, PREVIEW_CHANNEL } from "@/domain/storefront/preview-protocol";
import { ACCENT_SUGGESTIONS } from "@/domain/theme/suggestions";
import { PRESET_KEYS, PRESETS } from "@/domain/theme/presets";
import {
  addUnique,
  announcementId,
  formatBytes,
  heroQuality,
  moveItem,
  sameConfig,
  savedLabel,
  STEPS,
  stepSummary,
  structureChanged,
  themeChanged,
} from "./editor-state";

const base = defaultConfig("classic");
const names = { preset: (k: string) => k.toUpperCase(), font: (k: string | null) => k ?? "default" };

describe("change detection", () => {
  it("separates theme-only edits from structural ones", () => {
    const accent = { ...base, accent: "#123456" };
    expect(themeChanged(base, accent)).toBe(true);
    expect(structureChanged(base, accent)).toBe(false);

    const sections = { ...base, sections: [...base.sections].reverse() };
    expect(themeChanged(base, sections)).toBe(false);
    expect(structureChanged(base, sections)).toBe(true);

    expect(sameConfig(base, { ...base })).toBe(true);
    expect(sameConfig(base, accent)).toBe(false);
  });
});

describe("list helpers", () => {
  it("moves items and ignores out-of-range moves", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b"], 0, 5)).toEqual(["a", "b"]);
  });

  it("adds unique ids up to a maximum", () => {
    expect(addUnique(["a"], ["a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
  });
});

describe("announcement ids", () => {
  it("are stable for the same text and change with the text", () => {
    expect(announcementId("Closed 24–26 Dec")).toBe(announcementId("Closed 24–26 Dec"));
    expect(announcementId("Closed 24–26 Dec")).not.toBe(announcementId("Closed 24–27 Dec"));
    expect(announcementId("x")).toMatch(/^a[0-9a-z]+$/);
  });
});

describe("hints and labels", () => {
  it("flags soft hero photos (ED-4)", () => {
    expect(heroQuality(2400).ok).toBe(true);
    expect(heroQuality(800)).toMatchObject({ ok: false, message: expect.stringContaining("800 px wide") });
  });

  it("formats saved times and sizes", () => {
    const now = new Date("2026-10-08T12:00:00Z");
    expect(savedLabel(null, now)).toBe("Not saved yet");
    expect(savedLabel(new Date("2026-10-08T11:59:40Z"), now)).toBe("saved just now");
    expect(savedLabel(new Date("2026-10-08T11:58:00Z"), now)).toBe("saved 2 min ago");
    expect(formatBytes(345_678)).toBe("338 KB");
    expect(formatBytes(18 * 1024 * 1024)).toBe("18.0 MB");
  });

  it("summarises finished steps", () => {
    expect(stepSummary("preset", base, names)).toBe("CLASSIC");
    expect(stepSummary("colours", { ...base, accent: "#8a6a2f", mode: "auto" }, names)).toBe("#8A6A2F · auto");
    expect(stepSummary("logo", base, names)).toBe("Monogram");
    expect(stepSummary("sections", base, names)).toBe(`${base.sections.length} shown`);
    expect(stepSummary("publish", base, names)).toBe("");
    expect(STEPS.map((s) => s.key)).toEqual(["preset", "colours", "font", "logo", "hero", "sections", "content", "publish"]);
  });
});

describe("accent suggestions", () => {
  it("start with each preset's own accent", () => {
    for (const key of PRESET_KEYS) expect(ACCENT_SUGGESTIONS[key][0]).toBe(PRESETS[key].defaultAccent);
  });
});

describe("withoutMedia", () => {
  it("removes a photo from every place in the config", () => {
    const id = "8f14e45f-ceea-4e7a-9b6c-2d3a1f0e5b71";
    const other = "11111111-1111-4111-8111-111111111111";
    const c = { ...base, hero: { ...base.hero, mediaIds: [id, other] }, gallery: [other, id], aboutMediaId: id, logoMediaId: id };
    expect(withoutMedia(c, id)).toMatchObject({ hero: { mediaIds: [other] }, gallery: [other], aboutMediaId: null, logoMediaId: null });
  });
});

describe("preview protocol", () => {
  it("accepts only well-formed messages on our channel", () => {
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "theme", css: "html:root{}" })).toBe(true);
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "refresh" })).toBe(true);
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "scrollTo", id: "sec-gallery" })).toBe(true);
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "scrollTo", id: "x\"><img" })).toBe(false);
    expect(isPreviewMessage({ channel: "other", type: "refresh" })).toBe(false);
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "theme", css: "x".repeat(30_000) })).toBe(false);
    expect(isPreviewMessage({ channel: PREVIEW_CHANNEL, type: "eval" })).toBe(false);
    expect(isPreviewMessage(null)).toBe(false);
  });
});
