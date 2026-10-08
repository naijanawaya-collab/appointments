/**
 * The `[site]` route segment is either a shop slug ("kaiser", platform URL
 * /kaiser) or – after the proxy rewrite – a custom domain ("brosbab.com").
 * Slugs never contain dots; hostnames always do. Pure.
 */

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "b",
  "book",
  "fonts",
  "forgot-password",
  "health",
  "impressum",
  "login",
  "logout",
  "legal",
  "manage",
  "og",
  "preview",
  "privacy",
  "reset-password",
  "robots.txt",
  "signup",
  "sitemap.xml",
  "shops",
  "sites",
  "static",
  "terms",
  "www",
  "_next",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

export type SiteParam = { kind: "slug"; slug: string } | { kind: "host"; hostname: string };

export function parseSiteParam(raw: string): SiteParam | null {
  const value = decodeURIComponent(raw).toLowerCase();
  if (value.includes(".")) {
    return /^[a-z0-9.-]+$/.test(value) && value.length <= 253 ? { kind: "host", hostname: value } : null;
  }
  return SLUG_RE.test(value) ? { kind: "slug", slug: value } : null;
}

export function validateSlug(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Use 2–48 lowercase letters, numbers or dashes.";
  if (RESERVED_SLUGS.has(slug)) return "That address is reserved. Please pick another.";
  return null;
}

/** "Kaiser & Co. Barbers" → "kaiser-co-barbers" */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
