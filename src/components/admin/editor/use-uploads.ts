"use client";

import { useCallback, useState } from "react";
import { saveUploadAction, signUploadAction } from "@/app/admin/_actions/media";
import { uploadProblem, uploadToCloudinary } from "../upload";
import type { EditorMedia } from "./types";

export type UploadItem = {
  key: string;
  name: string;
  /** 0–100 while uploading, null when finished or failed */
  progress: number | null;
  error: string | null;
};

/**
 * Uploads several photos at once (straight to Cloudinary with a signature
 * from our server), tracking progress and errors per file. Each finished
 * photo is passed to `onUploaded` as soon as it is saved.
 */
export function useUploads(businessId: string, onUploaded: (media: EditorMedia) => void) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const patch = (key: string, p: Partial<UploadItem>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const upload = useCallback(
    async (files: FileList | File[], alt = ""): Promise<EditorMedia[]> => {
      const batch = Array.from(files).map((file, n) => ({ file, key: `${Date.now()}-${n}-${file.name}` }));
      setItems((list) => [
        ...list.filter((i) => i.progress !== null || i.error),
        ...batch.map(({ file, key }) => {
          const problem = uploadProblem(file);
          return { key, name: file.name, progress: problem ? null : 0, error: problem };
        }),
      ]);

      const saved = await Promise.all(
        batch.map(async ({ file, key }): Promise<EditorMedia | null> => {
          if (uploadProblem(file)) return null;
          try {
            const sig = await signUploadAction(businessId);
            if (!sig.ok) throw new Error(sig.error);
            const result = await uploadToCloudinary(sig.data, file, (progress) => patch(key, { progress }));
            const res = await saveUploadAction(businessId, result, alt);
            if (!res.ok) throw new Error(res.error);
            const media = res.data as EditorMedia;
            onUploaded(media);
            setItems((list) => list.filter((i) => i.key !== key));
            return media;
          } catch (err) {
            patch(key, { progress: null, error: err instanceof Error ? err.message : "Upload failed." });
            return null;
          }
        }),
      );
      return saved.filter((m): m is EditorMedia => m !== null);
    },
    [businessId, onUploaded],
  );

  const dismiss = (key: string) => setItems((list) => list.filter((i) => i.key !== key));
  return { items, upload, dismiss, busy: items.some((i) => i.progress !== null) };
}
