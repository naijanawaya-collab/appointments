"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import type { MediaView } from "@/domain/media/image";
import { useCarousel } from "@/lib/motion";

/** M-5 carousel hero (Soft preset). First slide is the LCP image. */
export function HeroCarousel({ slides }: { slides: MediaView[] }) {
  const c = useCarousel(slides.length, 5000);
  const multiple = slides.length > 1;

  return (
    <div className="hc" data-paused={c.paused} role="region" aria-roledescription="carousel" aria-label="Photos" {...c.swipe}>
      {slides.map((s, i) => (
        <Image
          key={s.id}
          className="hc-slide"
          data-active={i === c.index}
          src={s.src}
          alt={s.alt}
          aria-hidden={i !== c.index}
          draggable={false}
          fill
          sizes="(min-width: 1280px) 1216px, 100vw"
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          style={{ objectPosition: s.position }}
        />
      ))}
      <div className="hc-scrim" />
      {multiple && (
        <>
          <button type="button" onClick={c.prev} aria-label="Previous photo" className="hc-arrow" style={{ left: 16 }}>
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button type="button" onClick={c.next} aria-label="Next photo" className="hc-arrow" style={{ right: 16 }}>
            <ChevronRight size={22} aria-hidden />
          </button>
          <div className="hc-controls">
            <div role="tablist" aria-label="Choose photo" className="hc-dots">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  className="hc-dot"
                  aria-selected={i === c.index}
                  aria-label={`Photo ${i + 1} of ${slides.length}`}
                  onClick={() => c.go(i)}
                >
                  <span className="hc-dot__track">
                    <span className="hc-dot__fill" key={i === c.index ? c.index : "idle"} />
                  </span>
                </button>
              ))}
            </div>
            <button type="button" className="hc-pause" onClick={c.togglePause} aria-label={c.paused ? "Play slideshow" : "Pause slideshow"}>
              {c.paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
