import Link from "next/link";
import { requireSession } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

/** Everything under /admin requires a signed-in user. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            Admin
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</div>
    </div>
  );
}
