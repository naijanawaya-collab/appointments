import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="au-title">Forgot your password?</h1>
      <p className="au-lead">Enter your email and we’ll send you a link to choose a new one.</p>
      <ForgotForm defaultEmail={typeof email === "string" ? email : ""} />
    </>
  );
}
