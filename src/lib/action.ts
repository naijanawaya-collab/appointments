import "server-only";
import { ZodError } from "zod";
import { isDomainError } from "@/domain/errors";

/**
 * Uniform Server Action results, so every admin form handles success,
 * field errors and failures the same way (see useActionForm).
 */
export type ActionResult<T = null> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fieldErrorsOf(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

export async function runAction<T>(fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(err) };
    if (isDomainError(err)) return { ok: false, error: err.message };
    // redirect()/notFound() throw special errors that must propagate.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("[admin] action failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
