"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { deleteMediaAction, updateMediaAction } from "@/app/admin/_actions/storefront";
import { Dialog } from "@/components/ui/dialog";
import { formatBytes, heroQuality } from "./editor-state";
import type { EditorMedia } from "./types";

const CROPS = [
  { label: "Square", ratio: "1 / 1" },
  { label: "4:5 mobile", ratio: "4 / 5" },
  { label: "16:9 desktop", ratio: "16 / 9" },
] as const;

const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

/**
 * Edit one photo (editor board 4b): tap the photo to set the focal point
 * (every crop follows it), check the three crops, describe it for screen
 * readers, or delete it. Arrow keys move the focal point too.
 */
export function PhotoDialog({
  businessId,
  photo,
  shopName,
  forHero,
  onClose,
  onSaved,
  onDeleted,
}: {
  businessId: string;
  photo: EditorMedia | null;
  shopName: string;
  forHero?: boolean;
  onClose: () => void;
  onSaved: (media: EditorMedia) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Dialog open={photo !== null} onClose={onClose} title="Photo" size="lg">
      {photo && (
        <PhotoForm key={photo.id} businessId={businessId} photo={photo} shopName={shopName} forHero={forHero} onClose={onClose} onSaved={onSaved} onDeleted={onDeleted} />
      )}
    </Dialog>
  );
}

function PhotoForm({
  businessId,
  photo,
  shopName,
  forHero,
  onClose,
  onSaved,
  onDeleted,
}: {
  businessId: string;
  photo: EditorMedia;
  shopName: string;
  forHero?: boolean;
  onClose: () => void;
  onSaved: (media: EditorMedia) => void;
  onDeleted: (id: string) => void;
}) {
  const [focal, setFocal] = useState({ x: photo.focalX, y: photo.focalY });
  const [alt, setAlt] = useState(photo.alt);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const position = `${clamp(focal.x)}% ${clamp(focal.y)}%`;
  const quality = heroQuality(photo.width);

  function pick(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setFocal({ x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) });
  }

  function nudge(e: React.KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? 10 : 2;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setFocal((f) => ({ x: clamp(f.x + d[0]), y: clamp(f.y + d[1]) }));
  }

  const save = () =>
    start(async () => {
      setError(null);
      const res = await updateMediaAction(businessId, photo.id, { alt: alt.trim(), focalX: focal.x, focalY: focal.y });
      if (!res.ok) return setError(res.error);
      onSaved({ ...photo, ...(res.data as EditorMedia) });
      onClose();
    });

  const remove = () =>
    start(async () => {
      setError(null);
      const res = await deleteMediaAction(businessId, photo.id);
      if (!res.ok) return setError(res.error);
      onDeleted(photo.id);
      onClose();
    });

  return (
    <div className="ed-photo">
      <div className="ed-photo-main">
        <p className="ed-photo-meta">
          {photo.width} × {photo.height}
          {photo.bytes ? ` · ${formatBytes(photo.bytes)}` : ""}
          {photo.format ? ` ${photo.format.toUpperCase()}` : ""} · focal {clamp(focal.x)}% {clamp(focal.y)}%
        </p>
        <button
          type="button"
          className="ed-focal"
          onClick={pick}
          onKeyDown={nudge}
          aria-label={`Focal point ${clamp(focal.x)}% from left, ${clamp(focal.y)}% from top. Click the photo or use arrow keys to move it.`}
          style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
        >
          <Image src={photo.src} alt="" fill sizes="(min-width: 900px) 420px, 90vw" style={{ objectFit: "contain" }} />
          <span className="ed-focal-dot" style={{ left: `${focal.x}%`, top: `${focal.y}%` }} aria-hidden />
        </button>
        <p className="field-hint">Tap the photo to set the focal point; all crops follow it.</p>
      </div>

      <div className="ed-photo-side">
        <div className="ed-crops" aria-label="Crop previews">
          {CROPS.map((c) => (
            <figure key={c.label} className="ed-crop">
              <span className="ed-crop-box" style={{ aspectRatio: c.ratio }}>
                <Image src={photo.src} alt="" fill sizes="120px" style={{ objectFit: "cover", objectPosition: position }} />
              </span>
              <figcaption>{c.label}</figcaption>
            </figure>
          ))}
        </div>

        {forHero && (
          <p className={`ed-hint ${quality.ok ? "is-ok" : "is-warn"}`} role="note">
            {quality.ok ? "✓ " : "◐ "}
            {quality.message}
          </p>
        )}

        <label className="field-label" htmlFor="ed-photo-alt">
          Describe the photo (alt text)
        </label>
        <textarea id="ed-photo-alt" className="field-input" rows={3} maxLength={200} value={alt} onChange={(e) => setAlt(e.target.value)} aria-describedby="ed-photo-alt-hint" />
        <p className="field-hint" id="ed-photo-alt-hint">
          Read aloud to blind visitors. If empty we use “Inside {shopName}”.
        </p>

        {error && (
          <p className="field-error" role="alert">
            ! {error}
          </p>
        )}

        <div className="ed-photo-actions">
          {confirmDelete ? (
            <span className="ad-confirm" role="group" aria-label="Delete this photo?">
              <span>Delete this photo everywhere?</span>
              <button type="button" className="btn btn-danger" onClick={remove} disabled={pending} autoFocus>
                Delete
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)} disabled={pending}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-link ed-danger-link" onClick={() => setConfirmDelete(true)}>
              Delete photo
            </button>
          )}
          <span className="ed-spacer" />
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={pending}>
            {pending ? <span className="spinner" aria-hidden /> : null}
            Save photo
          </button>
        </div>
      </div>
    </div>
  );
}
