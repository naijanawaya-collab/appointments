"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "@/lib/auth-client";
import { signInSchema, type SignInInput } from "@/validation/auth";

/** Admin sign-in (screens/admin-signin.jpg): React Hook Form + Zod + Better Auth. */
export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema), mode: "onBlur" });

  const onSubmit = async (values: SignInInput) => {
    setServerError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setServerError(
        error.status === 401
          ? "Email or password is incorrect."
          : error.status === 429
            ? "Too many attempts. Wait a minute and try again."
            : "We couldn't sign you in. Please try again.",
      );
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  const passwordError = errors.password?.message ?? serverError;
  // eslint-disable-next-line react-hooks/incompatible-library -- watch() only feeds the forgot link
  const email = watch("email");

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="ad-form">
      <div>
        <label className="field-label" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="field-input"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p className="field-error" id="login-email-error">
            ! {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <div className="au-label-row">
          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <Link href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"}>Forgot?</Link>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className="field-input"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "login-password-error" : undefined}
          {...register("password")}
        />
        {passwordError && (
          <p className="field-error" id="login-password-error" role={serverError ? "alert" : undefined}>
            ! {passwordError}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg">
        {isSubmitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
