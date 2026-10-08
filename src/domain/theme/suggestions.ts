/**
 * Accent colours the editor suggests per preset (the preset's own accent
 * first). Any colour works: the theme engine makes it AA-safe.
 */
import type { PresetKey } from "./presets";

export const ACCENT_SUGGESTIONS: Record<PresetKey, string[]> = {
  editorial: ["#a8431f", "#1f5f5b", "#3d4a8f", "#7a3b69", "#1d1a17"],
  classic: ["#8a6a2f", "#7a2e2e", "#2f4a3a", "#28374f", "#2a2118"],
  modern: ["#ff5a1f", "#1f8fff", "#16a34a", "#e11d74", "#f5c518"],
  minimal: ["#18181b", "#2b59c3", "#0f766e", "#9a3412", "#6b21a8"],
  bold: ["#d4ff3a", "#ff3d7f", "#3dd6ff", "#ffb020", "#8b5cf6"],
  soft: ["#a3456b", "#6f5bb5", "#3f7d6e", "#b5603f", "#8a4f7d"],
};

