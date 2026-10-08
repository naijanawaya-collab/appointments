import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a password", robots: { index: false }, referrer: "no-referrer" };

/** Redeems reset and invite links (same single-use token, see src/lib/invites.ts). */
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token, invite, error } = await searchParams;
  const isInvite = invite === "1";

  if (typeof token !== "string" || !token || error) {
    return (
      <>
        <h1 className="au-title">This link has expired</h1>
        <p className="au-lead">Reset and invite links work once and expire. Request a new one and we’ll email it to you.</p>
        <Link href="/forgot-password" className="btn btn-primary btn-lg">
          Send a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="au-title">{isInvite ? "Welcome aboard" : "Choose a new password"}</h1>
      <p className="au-lead">{isInvite ? "Choose a password for your account. You’ll use it with your email to sign in." : "Use at least 8 characters."}</p>
      <ResetForm token={token} />
    </>
  );
}
