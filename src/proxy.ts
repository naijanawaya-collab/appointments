import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, createNonce } from "@/lib/csp";
import { isPlatformHost, normalizeHostname } from "@/lib/hosts";

/**
 * Next.js 16 "proxy" (formerly middleware). Runs before every page request
 * and never touches the database.
 *
 *   platform host  (localhost, *.vercel.app, PLATFORM_HOSTS)
 *     → passes through: /, /login, /admin, /<slug>, /<slug>/book …
 *     → a first path segment containing a dot is 404 (hostnames are internal)
 *
 *   any other host (a shop's custom domain, e.g. brosbab.com)
 *     → /admin and /login are 404 (the admin lives on the platform only)
 *     → everything else is rewritten to /brosbab.com/<path>; the browser
 *       still shows brosbab.com and src/app/[site] serves the shop.
 *
 * Every page also gets a Content-Security-Policy with a fresh script nonce
 * (src/lib/csp.ts); Next.js adds the nonce to its own scripts.
 *
 * /api/* is excluded by the matcher so the same API works on every host.
 */
const PLATFORM_ONLY = /^\/(admin|login|forgot-password|reset-password)(\/|$)/;

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  const nonce = createNonce();
  const https = (request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "")) === "https";
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development", https });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  if (isPlatformHost(host)) {
    if (firstSegment.includes(".")) return new NextResponse(null, { status: 404 });
    return withCsp(NextResponse.next({ request: { headers } }));
  }

  if (PLATFORM_ONLY.test(pathname)) return new NextResponse(null, { status: 404 });

  const url = request.nextUrl.clone();
  url.pathname = `/${normalizeHostname(host)}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return withCsp(NextResponse.rewrite(url, { request: { headers } }));
}

export const config = {
  // Skip API routes, Next internals and static files (anything with a file
  // extension). Prefetches must still run: custom domains need the rewrite.
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
