"use client";

import type { UploadResult, UploadSignature } from "@/domain/media/cloudinary";

/** Client-side checks before uploading (ED-4): ≤ 10 MB, JPEG/PNG/HEIC/WebP. */
export const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const MAX_BYTES = 10 * 1024 * 1024;
const OK_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/;

export function uploadProblem(file: File): string | null {
  if (file.size > MAX_BYTES) return `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 10 MB.`;
  const byName = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
  if (!OK_TYPES.test(file.type) && !byName) return "Use a JPEG, PNG, HEIC or WebP photo.";
  return null;
}

/**
 * Uploads straight from the browser to Cloudinary with a server-made
 * signature (no file bytes pass through our server), reporting progress.
 */
export function uploadToCloudinary(sig: UploadSignature, file: File, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(sig.fields)) body.append(k, v);
    body.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(json as UploadResult);
        else reject(new Error(json?.error?.message ?? "Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(body);
  });
}
