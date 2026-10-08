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
