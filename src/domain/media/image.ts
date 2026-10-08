/**
 * Turning a media row into what the UI renders. Pure: safe on server and client.
 */

export type MediaRow = {
  id: string;
  provider: "cloudinary" | "external";
  publicId: string | null;
  url: string | null;
  width: number;
  height: number;
  alt: string;
  focalX: number;
  focalY: number;
};

/** Everything a component needs to render an image without layout shift. */
export type MediaView = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** CSS object-position from the owner's focal point */
  position: string;
};

const PUBLIC_ID_RE = /^[A-Za-z0-9_\-/.]+$/;

export function cloudinaryBaseUrl(cloudName: string, publicId: string): string {
  if (!PUBLIC_ID_RE.test(publicId)) throw new Error("Invalid public id");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}`;
}

export function toMediaView(row: MediaRow, cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? ""): MediaView {
  const src =
    row.provider === "cloudinary" && row.publicId
      ? cloudinaryBaseUrl(cloudName, row.publicId)
      : (row.url ?? "");
  return {
    id: row.id,
    src,
    width: row.width,
    height: row.height,
    alt: row.alt,
    position: `${clampPct(row.focalX)}% ${clampPct(row.focalY)}%`,
  };
}

const clampPct = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/**
 * next/image loader: asks the image host for exactly the width the browser
 * needs, in the best format it supports.
 *  - Cloudinary: f_auto,q_auto,c_limit,w_<w>
 *  - Unsplash (demo shops): rewrites w= and q=
 *  - anything else: returned untouched
 */
export function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (src.startsWith("https://res.cloudinary.com/")) {
    const q = quality ? `q_${quality}` : "q_auto";
    return src.replace("/image/upload/", `/image/upload/f_auto,${q},c_limit,w_${width}/`);
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 70));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    return url.toString();
  }
  return src;
}

/** Larger delivery URL for places next/image isn't used (lightbox, OG images, email). */
export function sizedUrl(src: string, width: number, format?: "jpg" | "png"): string {
  const url = imageLoader({ src, width });
  if (format && url.includes("/image/upload/f_auto")) return url.replace("f_auto", `f_${format}`);
  return url;
}
