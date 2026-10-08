import Image from "next/image";
import type { MediaView } from "@/domain/media/image";

/** Uploaded logo, or the monogram tile (accent background, display font). */
export function ShopMark({ logo, mark, name, size = 36 }: { logo?: MediaView | null; mark?: string | null; name: string; size?: number }) {
  if (logo) {
    const width = Math.round((logo.width / logo.height) * size);
    return <Image src={logo.src} alt={logo.alt || name} width={width} height={size} style={{ height: size, width: "auto" }} />;
  }
  return (
    <span aria-hidden className="mark" style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}>
      {(mark || name).slice(0, 1).toUpperCase()}
    </span>
  );
}
