# MOTION: every animation, exactly

Implementation files: `code/motion.css` (all keyframes/transitions) + `code/motion-hooks.ts` (JS triggers) + `code/HeroCarousel.tsx`.
Rules for all motion:
- Animate **only `transform` and `opacity`** (plus `max-height` for the announcement and `width` for the carousel dot). No layout-affecting animation on scroll.
- Easing tokens: `--ease-out: cubic-bezier(.2,.8,.2,1)` (default), `--ease-spring: cubic-bezier(.34,1.56,.64,1)` (pops).
- One passive, rAF-throttled scroll listener per page (`useScrollEffects`). No scroll listeners in child components.
- `prefers-reduced-motion: reduce` → all of the below are off: content visible immediately, no autoplay, no parallax, instant state changes. The global rule is in `tokens/tokens.css`; JS hooks also check `prefersReducedMotion()`.
- Reveal hiding is applied by JS (`.reveal-ready` on `<html>`), so without JS everything is visible.

| ID | Element | Trigger | Spec | Code |
| --- | --- | --- | --- | --- |
| M-1 | Scroll reveal (`[data-reveal]`) | Enters viewport (IO threshold .12, rootMargin `0 0 -40px 0`), **once** | opacity 0→1, translateY 24px→0, 700 ms ease-out, delay `--reveal-delay` | motion.css §1, `useReveal(rootRef)` |
| M-2 | Sticky header | scrollY > 8 | min-height 64→56, border-bottom transparent→`--line`, shadow `0 6px 20px rgba(0,0,0,.06)`, 200 ms | §2, `useScrollEffects().scrolled` → `data-scrolled` |
| M-3 | Announcement dismiss | Click × | max-height 120→0 (300 ms ease-out), opacity →0 (200 ms). Remove from DOM on `transitionend`. | §3 |
| M-4 | Mobile menu | Hamburger | sheet below header: scale .96→1 + fade, 220 ms ease-out, origin top; icon swaps menu↔x | §4 |
| M-5 | Hero carousel | Autoplay 5 s; manual | crossfade 800 ms; active slide scale 1.06→1 over 6 s (Ken Burns); active dot width 14→34 px 300 ms; dot fill 0→100% linear over 5 s, paused when paused. Manual nav suspends autoplay for 4.5 s. Pauses on tab hidden. Swipe > 40 px. | §5, `useCarousel`, `HeroCarousel.tsx` |
| M-6 | Parallax hero (full-bleed) | Scroll | `--parallax-y = min(scrollY, 900) × 0.25` px; image `translate3d(0, var(--parallax-y), 0) scale(1.08)`; image box 120% tall, top −10% | §6, `useScrollEffects(imgRef)` |
| M-7 | Open-now dot | Always (only when open) | box-shadow ring 0→8 px, rgba(47,160,90,.55→0), 2 s infinite | §7 |
| M-8 | Team / gallery image hover | `(hover: hover)` only | scale 1→1.06, 500 ms ease-out, container `overflow:hidden` | §8 |
| M-9 | Lightbox | Gallery tile | overlay fade 250 ms; image scale .96→1 + fade 350 ms ease-out; ←/→ step, Esc/backdrop close, counter "n / N", focus trap, focus returns to tile, body scroll locked | §9, `useLightboxKeys` |
| M-10 | Mobile book bar | scrollY > 60% of viewport | translateY 110%→0, 350 ms ease-out. Hidden ≥ 900 px. | §10, `useScrollEffects().showBar` |
| M-11 | Booking step change | Continue/Back | `<main>` scrollTop=0, then WAAPI: opacity 0→1 + translateX(±24px→0), 280 ms ease-out (+24 forward, −24 back); focus step `<h2>` | `useStepTransition` |
| M-12 | Service select | Row tap | row bg → `--accent-subtle`, `inset 3px 0 0 var(--accent)`; check circle scale .92→1 with spring 200 ms, "+"→"✓" | §12 |
| M-13 | Skeletons | Loading | opacity .55↔1, 1.2 s infinite, stagger 100 ms via `--i` | §13 |
| M-14 | Confirmation check | Arrive on step 5 | scale 0→1.25→1, 450 ms spring | `popIn(el)` |
| M-15 | Manage inline panels | State change | translateY 8px→0 + fade, 250 ms (confirm) / 300 ms (cancelled) | §14 |
| M-16 | Buttons | Hover/active | bg → `--accent-hover` 150 ms; active scale .97 + `--accent-pressed` (100 ms) | §11 |

## Wiring example (storefront root, client component)

```tsx
'use client';
import { useRef } from 'react';
import { useReveal, useScrollEffects, scrollToSection } from '@/lib/motion-hooks';

export function StorefrontShell({ shop, children }) {
  const root = useRef<HTMLDivElement>(null);
  const heroImg = useRef<HTMLImageElement>(null);           // only for the full-bleed preset
  useReveal(root);
  const { scrolled, showBar } = useScrollEffects(shop.hero === 'full' ? heroImg : undefined);
  return (
    <div ref={root} className="sf" style={{ containerType: 'inline-size' }}>
      <header className="sf-header" data-scrolled={scrolled}>…</header>
      {/* sections use data-reveal + style={{'--reveal-delay':'80ms'}} */}
      {children}
      <div className="sf-bookbar" data-visible={showBar}>…</div>
    </div>
  );
}
```

Reveal delays used in the design: hero eyebrow 0 / image 0 / H1 80–140 / tagline 160–200 / buttons 240–260 / status 320 ms; section eyebrow 0, H2 60, body 120 ms; team cards `(i % 4) × 70` ms; gallery tiles `i × 60` ms.

## Performance budget
- No animation may cause layout (check Performance panel: no "Layout" in scroll frames).
- `will-change: transform` only on the parallax image and active carousel slide.
- INP < 200 ms on Moto G Power for service toggle and slot select.
