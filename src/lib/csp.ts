/**
 * Content-Security-Policy, built per request with a fresh nonce (src/proxy.ts).
 *
 *  scripts   only our own, carrying this request's nonce ('strict-dynamic'
 *            lets them load Next's chunks); no inline/injected scripts
 *  styles    'unsafe-inline' is needed for React's style attributes and the
 *            server-rendered theme <style>; CSS can't run code
 *  images    our origin, Cloudinary (shop photos), Unsplash (demo shops)
 *  frames    our own pages (editor preview) and OpenStreetMap (shop maps)
 *  connect   our API, Cloudinary uploads (signed by our server)
 *  framing   only by our own pages (frame-ancestors), never by other sites
 *
 * Pure, so it's unit-tested.
 */
export function buildCsp(nonce: string, { dev = false, https = true }: { dev?: boolean; https?: boolean } = {}): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https://api.cloudinary.com", ...(dev ? ["ws:", "wss:"] : [])],
    "frame-src": ["'self'", "https://www.openstreetmap.org"],
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (https && !dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** 128 bits of randomness, base64 (Edge and Node both have Web Crypto). */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
