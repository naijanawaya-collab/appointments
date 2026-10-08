"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { isPreviewMessage, PREVIEW_CHANNEL, type EditorToPreview } from "@/domain/storefront/preview-protocol";

export type PreviewDevice = "mobile" | "desktop";

export type PreviewHandle = {
  send: (msg: EditorToPreview) => void;
};

const WIDTH: Record<PreviewDevice, number> = { mobile: 390, desktop: 1280 };

/**
 * The live preview: the real storefront (draft) in an iframe, at phone or
 * desktop width, scaled to fit. The editor talks to it with postMessage
 * (same origin only), see PreviewBridge.
 */
export const PreviewFrame = forwardRef<PreviewHandle, { src: string; device: PreviewDevice; onReady: () => void; title: string }>(
  function PreviewFrame({ src, device, onReady, title }, ref) {
    const frame = useRef<HTMLIFrameElement>(null);
    const box = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [loaded, setLoaded] = useState(false);
    const width = WIDTH[device];

    useImperativeHandle(ref, () => ({
      send(msg) {
        frame.current?.contentWindow?.postMessage({ channel: PREVIEW_CHANNEL, ...msg }, window.location.origin);
      },
    }));

    useEffect(() => {
      function onMessage(e: MessageEvent) {
        if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
        if (isPreviewMessage(e.data) && e.data.type === "ready") {
          setLoaded(true);
          onReady();
        }
      }
      window.addEventListener("message", onMessage);
      return () => window.removeEventListener("message", onMessage);
    }, [onReady]);

    useEffect(() => {
      const el = box.current;
      if (!el) return;
      const fit = () => setScale(Math.min(1, (el.clientWidth - 2) / width));
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(el);
      return () => ro.disconnect();
    }, [width]);

    return (
      <div ref={box} className="ed-preview-box" data-device={device}>
        <div className="ed-preview-device" style={{ width: width * scale, height: device === "mobile" ? 844 * scale : "100%" }}>
          {!loaded && (
            <div className="ed-preview-loading" role="status">
              <span className="spinner" aria-hidden /> Loading preview…
            </div>
          )}
          <iframe
            ref={frame}
            src={src}
            title={title}
            className="ed-preview-iframe"
            style={{ width, height: device === "mobile" ? 844 : `${100 / scale}%`, transform: `scale(${scale})` }}
          />
        </div>
      </div>
    );
  },
);
