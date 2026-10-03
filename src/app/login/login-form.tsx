"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { signIn } from "@/lib/auth-client";
import { signInSchema, type SignInInput } from "@/validation/auth";

/** Admin sign-in: React Hook Form + Zod validation + Better Auth. */
export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (values: SignInInput) => {
    setServerError(null);
    const { error } = await signIn.email({ email: values.email, password: values.password });
    if (error) {
      setServerError(error.message ?? "Sign-in failed");
      return;
    }
    router.replace("/admin");
    router.refresh();
  };

  const input =
    "mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <label className="block text-sm font-medium">
        Email
        <input type="email" autoComplete="email" className={input} {...register("email")} />
        {errors.email && <span className="mt-1 block text-danger">{errors.email.message}</span>}
      </label>

      <label className="block text-sm font-medium">
        Password
        <input
          type="password"
          autoComplete="current-password"
          className={input}
          {...register("password")}
        />
        {errors.password && (
          <span className="mt-1 block text-danger">{errors.password.message}</span>
        )}
      </label>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
