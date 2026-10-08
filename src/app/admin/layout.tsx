import type { Metadata } from "next";
import { requireUser } from "@/lib/authz";
import "@/styles/admin.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Everything under /admin requires a signed-in user (per-shop checks happen in [shop]/layout). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireUser();
  return <div className="ad-root">{children}</div>;
}
