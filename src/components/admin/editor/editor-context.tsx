"use client";

import { createContext, useContext } from "react";
import type { StorefrontConfig } from "@/domain/storefront/config";
import type { EditorMedia, EditorShop } from "./types";

export type PickerRequest = {
  title: string;
  max: number;
  exclude?: string[];
  onPick: (ids: string[]) => void;
};

export type EditorContextValue = {
  shop: EditorShop;
  config: StorefrontConfig;
  published: StorefrontConfig;
  update: (fn: (c: StorefrontConfig) => StorefrontConfig) => void;
  library: EditorMedia[];
  mediaById: Map<string, EditorMedia>;
  openPicker: (req: PickerRequest) => void;
  editPhoto: (id: string, opts?: { forHero?: boolean }) => void;
  /** Scrolls the live preview to an element id (e.g. "sec-gallery"). */
  showInPreview: (id: string) => void;
};

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside the storefront editor");
  return ctx;
}
