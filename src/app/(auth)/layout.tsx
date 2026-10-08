import Link from "next/link";
import { PLATFORM_NAME } from "@/lib/platform";
import "@/styles/admin.css";

/** Sign in, forgot and reset password share the split layout (screens/admin-signin.jpg). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="au-shell">
      <main className="au-pane">
        <Link href="/" className="au-logo">
          {PLATFORM_NAME}
        </Link>
        <div className="au-body">{children}</div>
        <p className="au-foot">
          New shop? <Link href="/#get-started">Open your storefront</Link>
        </p>
      </main>
      <aside className="au-art" aria-hidden="true">
        <p className="au-art-big">Today: 14 bookings, 9 free slots.</p>
        <p className="au-art-small">Your day at a glance, the moment you sign in.</p>
      </aside>
    </div>
  );
}
