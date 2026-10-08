"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { EMAIL_RE } from "@/validation/booking";

const schema = z.object({ email: z.string().trim().regex(EMAIL_RE, "Enter a full email address, e.g. name@example.com") });

/**
 * Always shows the same confirmation, whether or not the account exists,
 * so the form can't be used to discover who has an account.
 */
export function ForgotForm({ defaultEmail }: { defaultEmail: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: defaultEmail } });

  if (sent) {
    return (
      <div className="ad-form">
        <p className="ad-note" role="status">
          If an account exists for <strong>{sent}</strong>, we’ve sent a link to reset the password. It expires in 1 hour.
        </p>
        <Link href="/login" className="btn btn-secondary">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="ad-form"
      onSubmit={handleSubmit(async ({ email }) => {
        setError(null);
        const { error } = await authClient.requestPasswordReset({ email });
        if (error && error.status === 429) return setError("Too many attempts. Wait a minute and try again.");
        setSent(email);
      })}
    >
      <div>
        <label className="field-label" htmlFor="forgot-email">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          className="field-input"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p className="field-error" id="forgot-email-error">
            ! {errors.email.message}
          </p>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          ! {error}
        </p>
      )}
      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg">
        {isSubmitting ? <span className="spinner" aria-hidden="true" /> : null}
        Send reset link
      </button>
      <Link href="/login" className="btn btn-link">
        Back to sign in
      </Link>
    </form>
  );
}
