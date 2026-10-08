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

const AUTH_PATHS = /^\/(admin|login|forgot-password|reset-password)(\/|$)/;

/**
 * The admin and sign-in live on one host (BETTER_AUTH_URL, e.g.
 * app.yourdomain.com) so there's one session cookie. On the other platform
 * hosts (yourdomain.com) those paths redirect there. Vercel preview URLs are
 * left alone so previews stay self-contained.
 */
export function authHostRedirect(host: string | null | undefined, pathname: string, appUrl: string | undefined): string | null {
  if (!appUrl || !AUTH_PATHS.test(pathname)) return null;
  const hostname = normalizeHostname(host);
  if (!hostname || hostname.endsWith(".vercel.app") || !platformHosts().includes(hostname)) return null;
  let app: URL;
  try {
    app = new URL(appUrl);
  } catch {
    return null;
  }
  return normalizeHostname(app.host) === hostname ? null : app.origin;
}
