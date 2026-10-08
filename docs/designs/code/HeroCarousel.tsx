'use client';
// Reference implementation of the carousel hero (Soft preset / Lune). Pair with motion.css §5 and useCarousel.
import { useCarousel } from './motion-hooks';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

type Slide = { src: string; alt: string };

export function HeroCarousel({ slides, wide }: { slides: Slide[]; wide: boolean }) {
  const c = useCarousel(slides.length, 5000);
  return (
    <div
      className="hc"
      data-paused={c.paused}
      role="region"
      aria-roledescription="carousel"
      aria-label="Studio photos"
      {...c.swipe}
      style={{ position: 'relative', aspectRatio: wide ? '21/9' : '4/5', maxHeight: 680, width: '100%',
        borderRadius: 'var(--radius)', overflow: 'hidden', touchAction: 'pan-y', userSelect: 'none',
        background: 'color-mix(in oklab, var(--accent) 14%, var(--background))' }}
    >
      {slides.map((s, i) => (
        <img key={s.src} className="hc-slide" data-active={i === c.index} src={s.src} alt={s.alt}
          aria-hidden={i !== c.index} draggable={false} fetchPriority={i === 0 ? 'high' : 'low'} loading={i === 0 ? 'eager' : 'lazy'} />
      ))}
      <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,.55), transparent)', pointerEvents: 'none' }} />
      {wide && (
        <>
          <button onClick={c.prev} aria-label="Previous photo" className="hc-arrow" style={arrow('left')}><ChevronLeft size={22} /></button>
          <button onClick={c.next} aria-label="Next photo" className="hc-arrow" style={arrow('right')}><ChevronRight size={22} /></button>
        </>
      )}
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div role="tablist" aria-label="Choose photo" style={{ display: 'flex', gap: 2 }}>
          {slides.map((_, i) => (
            <button key={i} role="tab" className="hc-dot" aria-selected={i === c.index} aria-label={`Photo ${i + 1} of ${slides.length}`}
              onClick={() => c.go(i)} style={{ border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {/* key forces the progress animation to restart on every slide change */}
              <span className="hc-dot__track"><span className="hc-dot__fill" key={i === c.index ? c.index : 'idle'} /></span>
            </button>
          ))}
        </div>
        <button onClick={c.togglePause} aria-label={c.paused ? 'Play slideshow' : 'Pause slideshow'}
          style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.45)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {c.paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
      </div>
    </div>
  );
}

const arrow = (side: 'left' | 'right'): React.CSSProperties => ({
  position: 'absolute', [side]: 16, top: '50%', transform: 'translateY(-50%)', width: 48, height: 48, borderRadius: '50%',
  border: 0, background: 'rgba(255,255,255,.88)', color: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
});
