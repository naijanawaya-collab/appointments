"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "stored-flag";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // storage blocked (private mode, sandbox): behave as "not set"
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * A boolean persisted in localStorage (e.g. "announcement dismissed").
 * Server render and first client render agree on `false`; the stored value
 * is applied right after hydration without an extra effect pass.
 */
export function useStoredFlag(key: string): [boolean, () => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => false,
  );
  const set = useCallback(() => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  }, [key]);
  return [value, set];
}
