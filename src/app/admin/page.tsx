import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listMyShops } from "@/domain/access/access";
import { requireUser } from "@/lib/authz";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const metadata: Metadata = { title: "Admin" };

/** Sends people to their shop (or operators to the shop list). */
export default async function AdminHome() {
  const user = await requireUser();
  const [first] = await listMyShops(user.userId);
  if (first) redirect(`/admin/${first.slug}`);
  if (user.isOperator) redirect("/admin/shops");
  return (
    <main className="ad-main">
      <div className="ad-main-inner" style={{ maxWidth: 520 }}>
        <h1 className="ad-title">No shop yet</h1>
        <p className="ad-card-intro">Your account ({user.email}) isn’t linked to a shop. Ask the shop owner to invite you.</p>
        <div>
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
