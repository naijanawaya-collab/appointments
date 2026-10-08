"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import { saveUploadAction, signUploadAction } from "@/app/admin/_actions/media";
import type { MediaView } from "@/domain/media/image";
import { ACCEPT, uploadProblem, uploadToCloudinary } from "./upload";

/**
 * One photo (staff portrait, service image): upload, replace or remove.
 * The full library / focal-point dialog lives in the storefront editor.
 */
export function MediaField({
  businessId,
  label,
  value,
  onChange,
  alt,
  shape = "square",
}: {
  businessId: string;
  label: string;
  value: MediaView | null;
  onChange: (media: MediaView | null) => void;
  /** Alt text saved with a new upload. */
  alt: string;
  shape?: "square" | "round";
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const problem = uploadProblem(file);
    if (problem) return setError(problem);
    setProgress(0);
    try {
      const sig = await signUploadAction(businessId);
      if (!sig.ok) throw new Error(sig.error);
      const result = await uploadToCloudinary(sig.data, file, setProgress);
      const saved = await saveUploadAction(businessId, result, alt);
      if (!saved.ok) throw new Error(saved.error);
      onChange(saved.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div>
      <span className="field-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="ad-inline" style={{ alignItems: "center" }}>
        {value ? (
          <Image src={value.src} alt="" width={64} height={64} className="ad-avatar" style={{ width: 64, height: 64, borderRadius: shape === "round" ? "50%" : 10, objectPosition: value.position }} />
        ) : (
          <span className="ad-avatar" style={{ width: 64, height: 64, borderRadius: shape === "round" ? "50%" : 10 }} aria-hidden="true" />
        )}
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={progress !== null} aria-describedby={error ? `${id}-error` : undefined}>
          {progress !== null ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Uploading {progress}%
            </>
          ) : value ? (
            "Replace photo"
          ) : (
            "Upload photo"
          )}
        </button>
        {value && progress === null && (
          <button type="button" className="btn btn-link" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          ! {error}
        </p>
      )}
    </div>
  );
}
