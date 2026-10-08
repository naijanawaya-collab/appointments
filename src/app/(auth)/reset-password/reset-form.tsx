"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authClient } from "@/lib/auth-client";
import { passwordSchema, type PasswordFormInput } from "@/validation/admin";

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormInput>({ resolver: zodResolver(passwordSchema), mode: "onBlur" });

  if (expired) {
    return (
      <div className="ad-form">
        <p className="field-error" role="alert">
          ! This link has expired or was already used.
        </p>
        <Link href="/forgot-password" className="btn btn-primary btn-lg">
          Send a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="ad-form"
      onSubmit={handleSubmit(async ({ password }) => {
        setError(null);
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) {
          if (error.code === "INVALID_TOKEN" || error.status === 400) return setExpired(true);
          return setError("Something went wrong. Please try again.");
        }
        router.replace("/login?reset=1");
      })}
    >
      <div>
        <label className="field-label" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          className="field-input"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="new-password-hint"
          {...register("password")}
        />
        <p className={errors.password ? "field-error" : "field-hint"} id="new-password-hint">
          {errors.password ? `! ${errors.password.message}` : "At least 8 characters."}
        </p>
      </div>
      <div>
        <label className="field-label" htmlFor="confirm-password">
          Repeat password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          className="field-input"
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={errors.confirm ? "confirm-password-error" : undefined}
          {...register("confirm")}
        />
        {errors.confirm && (
          <p className="field-error" id="confirm-password-error">
            ! {errors.confirm.message}
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
        Save password
      </button>
    </form>
  );
}
