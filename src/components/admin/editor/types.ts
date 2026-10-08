import type { MediaView } from "@/domain/media/image";

/** A photo in the shop's library, as the editor works with it. */
export type EditorMedia = MediaView & {
  focalX: number;
  focalY: number;
  bytes: number | null;
  format: string | null;
};

export type EditorShop = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  mark: string;
  tagline: string;
  /** Public URL of the storefront (custom domain when verified) */
  publicUrl: string;
  /** "/admin/<slug>" */
  adminBase: string;
  seoDefaults: { title: string; description: string };
};
