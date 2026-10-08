import type { NextConfig } from "next";

/**
 * Security headers on every response. The Content-Security-Policy itself is
 * set per request in src/proxy.ts (it needs a fresh nonce for scripts).
 * `frame-ancestors 'self'` (in the CSP) replaces X-Frame-Options so the
 * storefront editor can show the live preview in an iframe of our own origin.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Images are resized by Cloudinary / Unsplash themselves (src/domain/media/image.ts),
    // so Vercel's image optimisation isn't needed (and isn't billed).
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
