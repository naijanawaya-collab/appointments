"use client";

import Image from "next/image";
import { Check, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ACCEPT } from "../upload";
import type { EditorMedia } from "./types";
import type { UploadItem } from "./use-uploads";

/**
 * Choose photos from the shop's library or upload new ones (several at once).
 * New uploads appear in the library and are pre-selected.
 */
export function MediaPicker({
  open,
  title,
  library,
  exclude = [],
  max,
  uploads,
  onUpload,
  onDismissUpload,
  onClose,
  onPick,
}: {
  open: boolean;
  title: string;
  library: EditorMedia[];
  /** Already used in this place (not offered again) */
  exclude?: string[];
  max: number;
  uploads: UploadItem[];
  onUpload: (files: FileList) => Promise<EditorMedia[] | void>;
  onDismissUpload: (key: string) => void;
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const available = library.filter((m) => !exclude.includes(m.id));
  const busy = uploads.some((u) => u.progress !== null);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : max === 1 ? [id] : s.length < max ? [...s, id] : s));

  const close = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      size="lg"
      footer={
        <>
          <span className="ed-muted" aria-live="polite">
            {max > 1 ? `${selected.length} of up to ${max} selected` : selected.length ? "1 photo selected" : ""}
          </span>
          <span className="ed-spacer" />
          <button type="button" className="btn btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.length === 0}
            onClick={() => {
              onPick(selected);
              close();
            }}
          >
            {max === 1 ? "Use photo" : `Add ${selected.length || ""} photo${selected.length === 1 ? "" : "s"}`.replace("  ", " ")}
          </button>
        </>
      }
    >
      <div className="ed-picker-bar">
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          multiple={max > 1}
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload photos"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files?.length) return;
            const added = await onUpload(files);
            e.target.value = "";
            if (added?.length) setSelected((s) => [...s, ...added.map((m) => m.id)].slice(-max));
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
          <Upload size={16} aria-hidden /> Upload {max > 1 ? "photos" : "a photo"}
        </button>
        <span className="ed-muted">JPEG, PNG, HEIC or WebP · up to 10 MB each</span>
      </div>

      {uploads.length > 0 && (
        <ul className="ed-uploads" aria-label="Uploads">
          {uploads.map((u) => (
            <li key={u.key} className={u.error ? "is-error" : ""}>
              <span className="ed-upload-name">{u.name}</span>
              {u.error ? (
                <>
                  <span role="alert">! {u.error}</span>
                  <button type="button" className="btn btn-link" onClick={() => onDismissUpload(u.key)}>
                    Dismiss
                  </button>
                </>
              ) : (
                <>
                  <span className="ed-progress" role="progressbar" aria-valuenow={u.progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${u.name}`}>
                    <span style={{ width: `${u.progress ?? 0}%` }} />
                  </span>
                  <span className="tabular">{u.progress ?? 0} %</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {available.length === 0 ? (
        <p className="ad-empty">No photos yet. Upload some to get started.</p>
      ) : (
        <ul className="ed-library" aria-label="Your photos">
          {available.map((m) => {
            const on = selected.includes(m.id);
            return (
              <li key={m.id}>
                <button type="button" className="ed-library-item" aria-pressed={on} onClick={() => toggle(m.id)} aria-label={m.alt || "Photo without description"}>
                  <Image src={m.src} alt="" fill sizes="160px" style={{ objectFit: "cover", objectPosition: m.position }} />
                  {on && (
                    <span className="ed-library-check" aria-hidden>
                      <Check size={16} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
