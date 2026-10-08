import { renderTheme } from "@/domain/theme/render";
import type { StorefrontConfig } from "@/domain/storefront/config";

/** Short stable hash so React can dedupe/replace the hoisted <style>. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * Server-renders the shop's theme as CSS variables. React 19 hoists this
 * <style> into <head>, so the first paint already has the right colours
 * (T-2) and no JavaScript is needed to apply a theme.
 */
export function ThemeStyle({ config }: { config: Pick<StorefrontConfig, "preset" | "accent" | "mode" | "secondary" | "displayFont"> }) {
  const { css } = renderTheme(config);
  return (
    <style href={`theme-${hash(css)}`} precedence="high">
      {css}
    </style>
  );
}

export function themeViewport(config: Pick<StorefrontConfig, "preset" | "accent" | "mode" | "secondary" | "displayFont">) {
  const t = renderTheme(config);
  return {
    colorScheme: t.colorScheme === "light dark" ? ("light dark" as const) : t.colorScheme,
    themeColor:
      config.mode === "auto"
        ? [
            { media: "(prefers-color-scheme: light)", color: t.themeColor.light },
            { media: "(prefers-color-scheme: dark)", color: t.themeColor.dark },
          ]
        : config.mode === "dark"
          ? t.themeColor.dark
          : t.themeColor.light,
  };
}
