import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom gaps: scrollTo (step changes) and matchMedia (reduced-motion checks).
Object.defineProperty(window, "scrollTo", { value: () => {}, writable: true });
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("reduce"), // tests run with reduced motion
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});
