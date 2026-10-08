"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { cancelBookingByToken } from "@/domain/booking/cancel-booking";
import { isDomainError } from "@/domain/errors";
import { onBookingCancelled } from "@/domain/notifications/handlers";
import { cancelLimiter } from "@/lib/rate-limit";
import { invalidateBusiness } from "@/lib/tenant";

export type CancelState =
  | { status: "idle" }
  | { status: "cancelled" }
  | { status: "too_late" }
  | { status: "error"; message: string };

/**
 * Cancels a booking from the emailed manage link (G-3). The token itself is
 * the credential (256-bit, stored hashed). The server re-checks the
 * deadline; the client clock is never trusted (G-7). Server Actions are
 * POST-only and Next.js checks Origin vs Host, which covers CSRF.
 */
export async function cancelBookingAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!cancelLimiter(`cancel:${ip}`).ok) return { status: "error", message: "Too many attempts. Please try again later." };

  const token = String(formData.get("token") ?? "");
  try {
    const cancelled = await cancelBookingByToken(token);
    after(() => onBookingCancelled(cancelled));
    invalidateBusiness(cancelled.business.id); // the freed time shows up in "next free" again
    refresh(); // re-render the page in its cancelled state (G-3)
    return { status: "cancelled" };
  } catch (err) {
    if (isDomainError(err) && err.code === "CANCELLATION_CLOSED") {
      refresh(); // the page now renders the "too late" state (G-7)
      return { status: "too_late" };
    }
    if (isDomainError(err)) return { status: "error", message: err.message };
    console.error("[cancel] unexpected error", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
