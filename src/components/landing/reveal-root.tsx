"use client";

import { useRef, type ReactNode } from "react";
import { useReveal } from "@/lib/motion";

/**
 * Scroll reveals (M-1) for a server-rendered page: the only client code the
 * landing page ships. Without JS (or with reduced motion) everything is
 * simply visible.
 */
export function RevealRoot({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
