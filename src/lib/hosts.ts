/**
 * Which hostnames belong to the PLATFORM vs. to a tenant's custom domain.
 *
 * Imported by both `src/proxy.ts` and the tenant resolver, so keep it free of
 * database or server-only imports.
 */

/** "BrosBab.com:443." -> "brosbab.com" */
export function normalizeHostname(host: string | null | undefined): string {
  if (!host) return "";
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function platformHosts(): string[] {
  return (process.env.PLATFORM_HOSTS ?? "localhost,127.0.0.1")
    .split(",")
    .map((h) => normalizeHostname(h))
    .filter(Boolean);
}

/**
 * Platform hosts serve the landing page, /login, /admin and /book/[slug].
 * Every other host is treated as a tenant's custom domain.
 * Vercel production and preview URLs (*.vercel.app) always count as platform.
 */
export function isPlatformHost(host: string | null | undefined): boolean {
  const hostname = normalizeHostname(host);
  if (!hostname) return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return platformHosts().includes(hostname);
}
