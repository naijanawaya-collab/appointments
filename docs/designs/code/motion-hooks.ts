// Appointments — motion hooks (React 18+, client components). No animation library needed.
'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 1. Scroll reveal. Call once in the storefront/landing root. Adds .reveal-ready to <html>
 *  and .is-visible to every [data-reveal] once it enters the viewport. Delay via style="--reveal-delay:80ms". */
export function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    document.documentElement.classList.add('reveal-ready');
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    root.current.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

/** 2 + 6 + 10. One passive scroll listener (rAF-throttled) drives: header shrink, sticky book bar, parallax. */
export function useScrollEffects(parallaxImg?: React.RefObject<HTMLImageElement>) {
  const [scrolled, setScrolled] = useState(false);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    let raf = 0;
    const reduce = prefersReducedMotion();
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      setShowBar(y > window.innerHeight * 0.6);
      if (!reduce && parallaxImg?.current) parallaxImg.current.style.setProperty('--parallax-y', `${Math.min(y, 900) * 0.25}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [parallaxImg]);
  return { scrolled, showBar };
}

/** 5. Carousel state: autoplay 5 s, pause button, pauses when tab hidden or reduced motion,
 *  manual navigation suspends autoplay for 4.5 s, swipe threshold 40 px. */
export function useCarousel(count: number, interval = 5000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const lastNav = useRef(0);
  const startX = useRef<number | null>(null);
  const go = useCallback((i: number) => { lastNav.current = Date.now(); setIndex(((i % count) + count) % count); }, [count]);
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (paused || document.hidden || prefersReducedMotion() || Date.now() - lastNav.current < interval - 500) return;
      setIndex((i) => (i + 1) % count);
    }, interval);
    return () => clearInterval(id);
  }, [count, interval, paused]);
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => { startX.current = e.clientX; },
    onPointerUp: (e: React.PointerEvent) => {
      if (startX.current == null) return;
      const dx = e.clientX - startX.current; startX.current = null;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    },
  };
  return { index, go, next: () => go(index + 1), prev: () => go(index - 1), paused, togglePause: () => setPaused((p) => !p), swipe };
}

/** Booking step transition. Call with the current step key; returns a ref for the scrolling <main> and the step <h2>.
 *  Forward = slide from +24px, back = from −24px, 280 ms. Focus moves to the heading. Uses WAAPI (no CSS state juggling). */
export function useStepTransition(step: string, order: string[]) {
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const prev = useRef(step);
  useEffect(() => {
    if (prev.current === step) return;
    const fwd = order.indexOf(step) > order.indexOf(prev.current);
    prev.current = step;
    const m = main.current;
    if (m) {
      m.scrollTop = 0;
      if (!prefersReducedMotion())
        m.animate([{ opacity: 0, transform: `translateX(${fwd ? 24 : -24}px)` }, { opacity: 1, transform: 'none' }],
          { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    heading.current?.focus({ preventScroll: true });
  }, [step, order]);
  return { main, heading };
}

/** Confirmation check pop: scale 0 → 1.25 → 1, 450 ms spring. */
export function popIn(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return;
  el.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
    { duration: 450, easing: 'cubic-bezier(.34,1.56,.64,1)' });
}

/** Lightbox keyboard: Esc closes, ←/→ step. Also trap focus inside and restore focus to the opener on close. */
export function useLightboxKeys(open: boolean, onClose: () => void, onStep: (d: 1 | -1) => void, dialog: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onStep(1);
      if (e.key === 'ArrowLeft') onStep(-1);
      if (e.key === 'Tab' && dialog.current) {
        const f = [...dialog.current.querySelectorAll<HTMLElement>('button')];
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1]?.focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0]?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; opener?.focus(); };
  }, [open, onClose, onStep, dialog]);
}

/** Smooth-scroll to a storefront section, offset by the sticky header (64 px). */
export function scrollToSection(id: string) {
  const el = document.getElementById(id); if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}
