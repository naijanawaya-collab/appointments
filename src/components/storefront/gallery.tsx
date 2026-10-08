"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { InstagramIcon } from "@/components/ui/brand-icons";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { MediaView } from "@/domain/media/image";
import { useDialogKeys } from "@/lib/motion";

/**
 * Gallery tiles + lightbox (S-18, S-19, M-9). Shows 4 tiles on mobile and 5
 * on desktop (CSS container query); the last visible tile shows "+N".
 */
export function Gallery({ images, instagram }: { images: MediaView[]; instagram: string | null }) {
  const [open, setOpen] = useState(-1);
  const n = images.length;
  const few = n <= 2;
  const tiles = few ? images : images.slice(0, 5);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(-1), []);
  const step = useCallback((d: 1 | -1) => setOpen((i) => (i + d + n) % n), [n]);
  useDialogKeys(open >= 0, close, dialog, step);

  return (
    <>
      {n > 0 && (
        <div className="sf-gallery" data-few={few} data-count={Math.min(n, 3)}>
          {tiles.map((img, i) => {
            const mobileMore = !few && i === 3 && n > 4 ? n - 4 : 0;
            const desktopMore = !few && i === 4 && n > 5 ? n - 5 : 0;
            return (
              <button
                key={img.id}
                type="button"
                className="sf-tile zoom-on-hover"
                data-reveal
                style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}
                data-desktop-only={i === 4 ? "" : undefined}
                data-more-mobile={mobileMore ? "" : undefined}
                data-more-desktop={desktopMore ? "" : undefined}
                aria-label={`Open photo ${i + 1} of ${n}`}
                onClick={() => setOpen(i)}
              >
                <Image src={img.src} alt="" fill sizes="(min-width: 900px) 25vw, 50vw" style={{ objectFit: "cover", objectPosition: img.position }} />
                {(mobileMore || desktopMore) > 0 && (
                  <span className="sf-tile-more" aria-hidden>
                    +{mobileMore || desktopMore}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {few && (
        <div className="sf-soon">
          <span className="flex flex-col gap-0.5">
            <strong className="font-semibold">More work coming soon</strong>
            <span className="text-sm text-muted">We just opened. Fresh cuts land on Instagram first.</span>
          </span>
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <InstagramIcon size={16} aria-hidden />
              Follow on Instagram
            </a>
          )}
        </div>
      )}

      {open >= 0 && (
        <div ref={dialog} className="sf-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <div className="sf-lightbox-img" onClick={(e) => e.stopPropagation()}>
            <Image src={images[open].src} alt={images[open].alt} fill sizes="(min-width: 1200px) 1200px, 100vw" quality={80} />
          </div>
          <button type="button" className="sf-lb-btn" style={{ top: 12, right: 12 }} aria-label="Close" onClick={close}>
            <X size={22} aria-hidden />
          </button>
          {n > 1 && (
            <>
              <button
                type="button"
                className="sf-lb-btn"
                style={{ left: 12, top: "50%", transform: "translateY(-50%)" }}
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
              >
                <ChevronLeft size={22} aria-hidden />
              </button>
              <button
                type="button"
                className="sf-lb-btn"
                style={{ right: 12, top: "50%", transform: "translateY(-50%)" }}
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
              >
                <ChevronRight size={22} aria-hidden />
              </button>
            </>
          )}
          <span className="sf-lb-count" aria-live="polite">
            {open + 1} / {n}
          </span>
        </div>
      )}
    </>
  );
}

export function GalleryHeaderButton({ count }: { count: number }) {
  return (
    <button
      type="button"
      className="btn btn-link"
      onClick={() => document.querySelector<HTMLButtonElement>(".sf-tile")?.click()}
    >
      View all {count} photos
    </button>
  );
}
