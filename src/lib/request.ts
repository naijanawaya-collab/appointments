/**
 * Request helpers for route handlers. Framework-agnostic (plain `Request`).
 */
import { normalizeHostname } from "./hosts";

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function requestHost(request: Request) {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host");
}

/**
 * CSRF guard for state-changing requests: the browser's Origin must match
 * the host the request was sent to (works for platform and custom domains).
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return normalizeHostname(new URL(origin).host) === normalizeHostname(requestHost(request));
  } catch {
    return false;
  }
}

/** "https://brosbab.com" – used to build links in emails for the domain the customer used. */
export function publicBaseUrl(request: Request): string {
  const host = requestHost(request) ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (/^(localhost|127\.0\.0\.1|[^:]+\.localhost)(:\d+)?$/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
