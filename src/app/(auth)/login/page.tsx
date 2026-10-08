import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSession()) redirect("/admin");
  const { reset } = await searchParams;

  return (
    <>
      <h1 className="au-title">Business sign in</h1>
      <p className="au-lead">Manage bookings, services and staff.</p>
      {reset === "1" && (
        <p className="ad-note" role="status">
          Password saved. Sign in with your new password.
        </p>
      )}
      <LoginForm />
    </>
  );
}
