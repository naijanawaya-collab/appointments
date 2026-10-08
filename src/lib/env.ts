/**
 * Environment checks, run once when the server starts (src/instrumentation.ts).
 *
 * Missing *required* settings stop a production server from starting with a
 * clear message, instead of failing later on the first booking or sign-in.
 * Missing *optional* integrations only log what will be switched off.
 * Pure: takes the env as an argument, so it's unit-tested.
 */
import { z } from "zod";

type Env = Record<string, string | undefined>;

export type EnvReport = { errors: string[]; warnings: string[] };

const url = (v: string | undefined) => z.url({ protocol: /^https?$/ }).safeParse(v).success;

export function checkEnv(env: Env, production = env.NODE_ENV === "production"): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const need = (ok: boolean, message: string) => (ok ? null : (production ? errors : warnings).push(message));

  need(Boolean(env.DATABASE_URL?.startsWith("postgres")), "DATABASE_URL must be a postgres:// connection string (Neon: use the pooled one).");

  const secret = env.BETTER_AUTH_SECRET ?? "";
  need(secret.length >= 32 && !/change-me/i.test(secret), "BETTER_AUTH_SECRET must be a random string of at least 32 characters (openssl rand -base64 32).");
  need(url(env.BETTER_AUTH_URL), "BETTER_AUTH_URL must be the full URL of the app, e.g. https://app.yourdomain.com.");
  need(url(env.NEXT_PUBLIC_PLATFORM_URL), "NEXT_PUBLIC_PLATFORM_URL must be the platform's public URL, e.g. https://yourdomain.com.");
  need(Boolean(env.PLATFORM_HOSTS?.trim()), "PLATFORM_HOSTS must list the platform's own hostnames, e.g. yourdomain.com,app.yourdomain.com.");

  const emailDriver = env.EMAIL_DRIVER;
  if (emailDriver !== "console" && emailDriver !== "memory") {
    need(Boolean(env.RESEND_API_KEY), "RESEND_API_KEY is missing: booking confirmations and password emails can't be sent.");
    need(/@/.test(env.EMAIL_FROM ?? ""), 'EMAIL_FROM must be a sender on your verified Resend domain, e.g. "Bookings <bookings@mail.yourdomain.com>".');
  }

  const cloudinary = [env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? env.CLOUDINARY_CLOUD_NAME, env.CLOUDINARY_API_KEY, env.CLOUDINARY_API_SECRET];
  if (!cloudinary.every(Boolean)) warnings.push("Cloudinary keys are incomplete: owners can't upload photos until they're set.");
  if (!env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID) warnings.push("VERCEL_TOKEN / VERCEL_PROJECT_ID not set: custom domains must be added in the Vercel dashboard by hand.");
  if (!env.PLATFORM_ADMIN_EMAILS?.trim()) warnings.push("PLATFORM_ADMIN_EMAILS is empty: nobody can create shops in /admin/shops.");

  return { errors, warnings };
}

/** Logs the report; throws in production when something required is missing. */
export function assertEnv(env: Env = process.env) {
  const { errors, warnings } = checkEnv(env);
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length) {
    throw new Error(`Missing or invalid environment variables:\n  - ${errors.join("\n  - ")}\nSee docs/SETUP.md.`);
  }
}
