import { NextResponse, type NextRequest } from "next/server";
import { isPlatformHost, normalizeHostname } from "@/lib/hosts";

/**
 * Next.js 16 "proxy" (formerly middleware). Runs before every page request.
 *
 * It does ONE cheap thing and never touches the database:
 *
 *   platform host  (localhost, *.vercel.app, PLATFORM_HOSTS)
 *     -> request passes through: /, /login, /admin, /book/[slug] ...
 *
 *   any other host (a tenant's custom domain, e.g. brosbab.com)
 *     -> rewritten internally to /sites/brosbab.com/<path>
 *        The browser still shows brosbab.com; the page under
 *        src/app/sites/[host] looks the business up by hostname.
 *
 * API routes (/api/*) are excluded by the matcher, so the same endpoints work
 * from both the platform and custom domains.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const { pathname, search } = request.nextUrl;

  if (isPlatformHost(host)) {
    // /sites/* is an internal route; don't expose it on the platform domain.
    if (pathname === "/sites" || pathname.startsWith("/sites/")) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  const hostname = normalizeHostname(host);
  const url = request.nextUrl.clone();
  url.pathname = `/sites/${hostname}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip API routes, Next internals and static files (anything with a file extension).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
};
