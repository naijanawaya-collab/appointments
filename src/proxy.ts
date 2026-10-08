import { NextResponse, type NextRequest } from "next/server";
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
 * /api/* is excluded by the matcher so the same API works on every host.
 */
const PLATFORM_ONLY = /^\/(admin|login|forgot-password|reset-password)(\/|$)/;

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (isPlatformHost(host)) {
    if (firstSegment.includes(".")) return new NextResponse(null, { status: 404 });
    return NextResponse.next();
  }

  if (PLATFORM_ONLY.test(pathname)) return new NextResponse(null, { status: 404 });

  const url = request.nextUrl.clone();
  url.pathname = `/${normalizeHostname(host)}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and static files (anything with a file extension).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
