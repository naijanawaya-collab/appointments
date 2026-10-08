"use client";
/**
 * Motion hooks (MOTION.md, adapted from docs/designs/code/motion-hooks.ts).
 * No animation library: IntersectionObserver, one rAF-throttled scroll
 * listener, and the Web Animations API. Everything respects reduced motion.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** M-1: reveal every [data-reveal] inside `root` once it enters the viewport. */
export function useReveal(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n));
    return () => {
      io.disconnect();
      document.documentElement.classList.remove("reveal-ready");
    };
  }, [root]);
}

/**
 * M-2, M-6, M-10: one passive scroll listener drives the header state, the
 * mobile book bar and the parallax image (any [data-parallax] in `root`).
 */
export function useScrollEffects(root: React.RefObject<HTMLElement | null>) {
  const [scrolled, setScrolled] = useState(false);
  const [showBar, setShowBar] = useState(false);
  useEffect(() => {
    let raf = 0;
    const reduce = prefersReducedMotion();
    const parallax = root.current?.querySelector<HTMLElement>("[data-parallax]") ?? null;
    const tick = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      setShowBar(y > window.innerHeight * 0.6);
      if (!reduce && parallax) parallax.style.setProperty("--parallax-y", `${Math.min(y, 900) * 0.25}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [root]);
  return { scrolled, showBar };
}

/** M-5: carousel state – autoplay, pause, swipe, manual nav suspends autoplay. */
export function useCarousel(count: number, interval = 5000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const lastNav = useRef(0);
  const startX = useRef<number | null>(null);
  const go = useCallback(
    (i: number) => {
      lastNav.current = Date.now();
      setIndex(((i % count) + count) % count);
    },
    [count],
  );
  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => {
      if (paused || document.hidden || prefersReducedMotion() || Date.now() - lastNav.current < interval - 500) return;
      setIndex((i) => (i + 1) % count);
    }, interval);
    return () => clearInterval(id);
  }, [count, interval, paused]);
  const swipe = {
    onPointerDown: (e: React.PointerEvent) => {
      startX.current = e.clientX;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (startX.current == null) return;
      const dx = e.clientX - startX.current;
      startX.current = null;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    },
  };
  return { index, go, next: () => go(index + 1), prev: () => go(index - 1), paused, togglePause: () => setPaused((p) => !p), swipe };
}

/** M-11: slide the step in (±24px) and focus its heading. */
export function useStepTransition(step: string, order: readonly string[]) {
  const main = useRef<HTMLElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const prev = useRef(step);
  useEffect(() => {
    if (prev.current === step) return;
    const forward = order.indexOf(step) > order.indexOf(prev.current);
    prev.current = step;
    window.scrollTo({ top: 0 });
    const m = main.current;
    if (m && !prefersReducedMotion() && typeof m.animate === "function") {
      m.animate([{ opacity: 0, transform: `translateX(${forward ? 24 : -24}px)` }, { opacity: 1, transform: "none" }], {
        duration: 280,
        easing: "cubic-bezier(.2,.8,.2,1)",
      });
    }
    heading.current?.focus({ preventScroll: true });
  }, [step, order]);
  return { main, heading };
}

/** M-14: confirmation check pop. */
export function popIn(el: HTMLElement | null) {
  if (!el || prefersReducedMotion() || typeof el.animate !== "function") return;
  el.animate([{ transform: "scale(0)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], {
    duration: 450,
    easing: "cubic-bezier(.34,1.56,.64,1)",
  });
}

/** M-9: lightbox keys (Esc / ← / →), focus trap, scroll lock, focus restore. */
export function useDialogKeys(
  open: boolean,
  onClose: () => void,
  dialog: React.RefObject<HTMLElement | null>,
  onStep?: (d: 1 | -1) => void,
) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (onStep && e.key === "ArrowRight") onStep(1);
      if (onStep && e.key === "ArrowLeft") onStep(-1);
      if (e.key === "Tab" && dialog.current) {
        const f = [...dialog.current.querySelectorAll<HTMLElement>("button, [href], input, textarea, select")];
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          f.at(-1)?.focus();
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault();
          f[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open, onClose, onStep, dialog]);
}

/** S-4: smooth-scroll to a section with the sticky-header offset. */
export function scrollToSection(id: string, offset = 64) {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({
    top: el.getBoundingClientRect().top + window.scrollY - offset,
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });
}
