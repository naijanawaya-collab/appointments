/**
 * Platform branding. The product name is configurable so the final brand can
 * be set with an env var once the domain is bought (no code change).
 */
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "Appointments";

/** Public URL of the platform (landing page), e.g. https://nextchair.com */
export const PLATFORM_URL = (process.env.NEXT_PUBLIC_PLATFORM_URL || "http://localhost:3000").replace(/\/$/, "");
