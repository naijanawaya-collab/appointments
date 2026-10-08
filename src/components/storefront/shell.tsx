"use client";

import { ArrowRight, Menu, Navigation, Phone, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShopMark } from "@/components/site/shop-mark";
import type { MediaView } from "@/domain/media/image";
import { prefersReducedMotion, scrollToSection, useReveal, useScrollEffects } from "@/lib/motion";
import { useStoredFlag } from "@/lib/use-stored-flag";

type Props = {
  businessId: string;
  short: string;
  mark: string | null;
  logo: MediaView | null;
  nav: { id: string; label: string }[];
  links: { home: string; book: string; tel: string | null; directions: string | null };
  phone: string;
  announcement: { id: string; tag: string; text: string } | null;
  children: React.ReactNode;
};

/**
 * Client shell around the server-rendered storefront: scroll reveal, the
 * sticky header + mobile menu, the announcement and the mobile book bar.
 * One scroll listener for everything (MOTION.md rules).
 */
export function StorefrontShell(p: Props) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  const { scrolled, showBar } = useScrollEffects(root);

  return (
    <div ref={root} className="sf">
      {p.announcement && <Announcement businessId={p.businessId} {...p.announcement} />}
      <Header {...p} scrolled={scrolled} />
      <main id="main">{p.children}</main>
      <BookBar businessId={p.businessId} book={p.links.book} visible={showBar} />
    </div>
  );
}

function Announcement({ businessId, id, tag, text }: { businessId: string; id: string; tag: string; text: string }) {
  const [stored, persist] = useStoredFlag(`ann:${businessId}:${id}`);
  const [collapsing, setCollapsing] = useState(false);
  const [gone, setGone] = useState(false);

  if (stored && !collapsing) return null; // dismissed on an earlier visit (S-2)
  if (gone) return null;
  return (
    <div className="sf-announcement" data-dismissed={collapsing} onTransitionEnd={() => collapsing && setGone(true)}>
      <div className="sf-ann-bar" role="region" aria-label="Announcement">
        <span className="sf-ann-text">
          {tag && <span className="sf-ann-tag">{tag}</span>}
          <span>{text}</span>
        </span>
        <button
          type="button"
          className="sf-ann-close"
          aria-label="Dismiss announcement"
          onClick={() => {
            setCollapsing(true); // M-3 collapse, then removed on transitionend
            persist();
            if (prefersReducedMotion()) setGone(true);
          }}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Header(p: Props & { scrolled: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const go = (id: string) => {
    close();
    scrollToSection(id);
  };

  return (
    <header className="sf-header" data-scrolled={p.scrolled} data-menu={open}>
      <a
        href={p.links.home}
        className="sf-brand"
        onClick={(e) => {
          e.preventDefault();
          close();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <ShopMark logo={p.logo} mark={p.mark} name={p.short} />
        <span className="sf-brand-name display">{p.short}</span>
      </a>

      {p.nav.length > 0 && (
        <nav className="sf-nav" aria-label="Sections">
          {p.nav.map((n) => (
            <button key={n.id} type="button" onClick={() => go(n.id)}>
              {n.label}
            </button>
          ))}
        </nav>
      )}

      <span className="sf-header-actions">
        <Link href={p.links.book} className="btn btn-primary" data-track="book_click:header">
          Book now
        </Link>
        <button
          type="button"
          className="sf-menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="sf-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </span>

      {open && (
        <div id="sf-menu" className="sf-menu">
          {p.nav.map((n) => (
            <button key={n.id} type="button" className="sf-menu-item display" onClick={() => go(n.id)}>
              {n.label}
              <ArrowRight size={20} aria-hidden />
            </button>
          ))}
          <div className="sf-menu-actions">
            {p.links.tel && (
              <a href={p.links.tel} className="btn btn-secondary tabular">
                <Phone size={16} aria-hidden />
                {p.phone}
              </a>
            )}
            {p.links.directions && (
              <a href={p.links.directions} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <Navigation size={16} aria-hidden />
                Directions
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

type NextFree = { label: string } | null;

function BookBar({ businessId, book, visible }: { businessId: string; book: string; visible: boolean }) {
  const [nextFree, setNextFree] = useState<NextFree | undefined>(undefined);

  // Fetch lazily the first time the bar appears (keeps the initial page light).
  useEffect(() => {
    if (!visible || nextFree !== undefined) return;
    let cancelled = false;
    fetch(`/api/businesses/${businessId}/next-available`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { label?: string } | null) => !cancelled && setNextFree(d?.label ? { label: d.label } : null))
      .catch(() => !cancelled && setNextFree(null));
    return () => {
      cancelled = true;
    };
  }, [visible, nextFree, businessId]);

  return (
    <div className="sf-bookbar" data-visible={visible} aria-hidden={!visible}>
      <span className="sf-bookbar-copy">
        {nextFree && <strong>Next free: {nextFree.label}</strong>}
        <span className="text-muted">Book online in under a minute</span>
      </span>
      <Link href={book} className="btn btn-primary btn-md" tabIndex={visible ? 0 : -1}>
        Book now
      </Link>
    </div>
  );
}

/** Small client island for buttons that scroll to a section (server components can't). */
export function ScrollToButton({ target, className, children }: { target: string; className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => scrollToSection(target)}>
      {children}
    </button>
  );
}
