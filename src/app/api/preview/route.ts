import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAccessBySlug } from "@/domain/access/access";
import { hasRole } from "@/domain/access/roles";
import { getSession } from "@/lib/session";

const query = z.object({
  shop: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/),
  // Only paths inside the shop (no protocol, no "//", no "..").
  path: z
    .string()
    .regex(/^\/(?:[a-z0-9_-]+\/?)*$/)
    .max(100)
    .default("/"),
  exit: z.literal("1").optional(),
});

/**
 * Turns the storefront draft preview on (or off) for the signed-in owner.
 *
 *   /api/preview?shop=kaiser            → Draft Mode on  → /kaiser (draft)
 *   /api/preview?shop=kaiser&exit=1     → Draft Mode off → /kaiser (published)
 *
 * Draft Mode alone shows nothing to strangers: `loadSite` additionally checks
 * that the viewer is an owner of that shop (or an operator) before it ever
 * loads a draft. Used by the editor's live preview iframe.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = query.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const { shop, path, exit } = parsed.data;
  const target = new URL(`/${shop}${path === "/" ? "" : path}`, url.origin);

  const draft = await draftMode();
  if (exit) {
    draft.disable();
    return NextResponse.redirect(target, 303);
  }

  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", url.origin), 303);
  const access = await getAccessBySlug({ userId: session.user.id, email: session.user.email }, shop);
  if (!access || !hasRole(access.role, "owner")) return NextResponse.json({ error: "Not found" }, { status: 404 });

  draft.enable();
  const res = NextResponse.redirect(target, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
