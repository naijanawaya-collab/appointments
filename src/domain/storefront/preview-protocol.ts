/**
 * Messages between the storefront editor (parent window) and the draft
 * preview (iframe). Pure, shared by both sides; both also check origin.
 */
export const PREVIEW_CHANNEL = "storefront-preview";

/** What the editor sends to the preview. */
export type EditorToPreview = { type: "theme"; css: string } | { type: "refresh" } | { type: "scrollTo"; id: string };

export type PreviewMessage = (EditorToPreview | { type: "ready" }) & { channel: typeof PREVIEW_CHANNEL };

export function isPreviewMessage(data: unknown): data is PreviewMessage {
  if (!data || typeof data !== "object") return false;
  const m = data as Record<string, unknown>;
  if (m.channel !== PREVIEW_CHANNEL) return false;
  switch (m.type) {
    case "theme":
      return typeof m.css === "string" && m.css.length < 20_000;
    case "scrollTo":
      return typeof m.id === "string" && /^[a-z][a-z0-9-]{0,40}$/.test(m.id);
    case "refresh":
    case "ready":
      return true;
    default:
      return false;
  }
}
