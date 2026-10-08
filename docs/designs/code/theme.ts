// Server-side theming. Render the resolved variables on <html> so there is never a flash of the wrong theme.
// Source data: tokens/themes.json (same shape as prototype/shops.js → window.THEMES).
import themes from '../tokens/themes.json';

export type Mode = 'light' | 'dark' | 'auto';
type TokenSet = Record<`--${string}`, string>;

/** Returns attributes + an inline <style> string for the storefront root.
 *  light/dark → one inline style. auto → light inline + a prefers-color-scheme media block. */
export function themeAttributes(themeKey: string, ownerMode?: Mode) {
  const t = (themes as any)[themeKey] ?? (themes as any).platform;
  const mode: Mode = ownerMode ?? t.defaultMode;
  const toCss = (o: TokenSet) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
  if (mode === 'auto') {
    return {
      'data-theme': themeKey, 'data-mode': 'auto',
      style: toCss(t.light),
      css: `@media (prefers-color-scheme: dark){[data-theme="${themeKey}"][data-mode="auto"]{${toCss(t.dark)}}}`,
      colorScheme: 'light dark',
    };
  }
  return { 'data-theme': themeKey, 'data-mode': mode, style: toCss(t[mode]), css: '', colorScheme: mode };
}

/* Usage in app/(storefront)/[shop]/layout.tsx:
   const a = themeAttributes(shop.themeKey, shop.mode);
   return (<html lang="de" data-theme={a['data-theme']} data-mode={a['data-mode']} style={parseStyle(a.style)}>
     <head>{a.css && <style dangerouslySetInnerHTML={{ __html: a.css }} />}<meta name="color-scheme" content={a.colorScheme} />
           <meta name="theme-color" content={t.light['--background']} /></head>
     <body>{children}</body></html>);
*/

/** Owner-chosen accent → derived tokens (see Design System §04). Use for presets beyond the 3 demo shops. */
export const derivedAccentCss = `
  --accent-hover: oklch(from var(--accent) calc(l - .06) c h);
  --accent-pressed: oklch(from var(--accent) calc(l - .12) c h);
  --accent-subtle: color-mix(in oklab, var(--accent) 12%, var(--background));
`;
// Dark mode: hover = l + .06, pressed = l + .10. --accent-text and --accent-foreground must be computed on the server
// (contrast math, WCAG 2.1): foreground = whichever of #000/#fff has higher contrast on --accent;
// accent-text = accent stepped in OKLCH lightness by .02 until ≥ 4.5:1 on --background (max 40 steps).
