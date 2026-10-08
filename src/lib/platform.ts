/**
 * Platform branding. The product name is configurable so the final brand can
 * be set with an env var once the domain is bought (no code change).
 */
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Appointments";

/** Public URL of the platform (landing page), e.g. https://nextchair.com */
export const PLATFORM_URL = (process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000").replace(/\/$/, "");

/** Origin of the admin app (app.<domain>); links in account emails point here. Server-only. */
export function appUrl(path = "/"): string {
  const base = (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Where "Open your storefront" sends people until self-serve sign-up exists. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export function requestAccessHref(): string {
  if (!CONTACT_EMAIL) return "/login";
  const subject = encodeURIComponent(`I'd like a storefront on ${PLATFORM_NAME}`);
  const body = encodeURIComponent("Shop name:\nWhat you offer:\nYour website or Instagram (if any):\nPhone:\n");
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}

/**
 * Who runs the platform, for the platform's Impressum (required in Austria).
 * Set these before launch; the page says clearly if they're missing.
 */
export const PLATFORM_OPERATOR = {
  name: process.env.PLATFORM_OPERATOR_NAME || "",
  address: process.env.PLATFORM_OPERATOR_ADDRESS || "",
  city: process.env.PLATFORM_OPERATOR_CITY || "Vienna",
};
