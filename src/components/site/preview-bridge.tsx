"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isPreviewMessage, PREVIEW_CHANNEL } from "@/domain/storefront/preview-protocol";

/**
 * Runs only inside a draft preview. Lets the storefront editor (the parent
 * window, same origin) update the page without a reload:
 *
 *   theme    → swap the CSS variables instantly (ED-1: ≤ 100 ms)
 *   refresh  → re-render server components with the freshly saved draft
 *   scrollTo → bring a section into view while the owner edits it
 *
 * Messages from any other origin or window are ignored.
 */
export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    const embedded = window.parent !== window;
    if (embedded) document.documentElement.dataset.embedded = "true";

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const msg = event.data;
      if (!isPreviewMessage(msg)) return;

      if (msg.type === "theme") {
        let style = document.getElementById("live-theme") as HTMLStyleElement | null;
        if (!style) {
          style = document.createElement("style");
          style.id = "live-theme";
          document.head.appendChild(style);
        }
        // Appended last in <head>, so it wins over the server-rendered theme.
        style.textContent = msg.css;
      } else if (msg.type === "refresh") {
        router.refresh();
      } else if (msg.type === "scrollTo") {
        document.getElementById(msg.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    window.addEventListener("message", onMessage);
    if (embedded) window.parent.postMessage({ channel: PREVIEW_CHANNEL, type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
