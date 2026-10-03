"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { cancelBookingByToken } from "@/domain/booking/cancel-booking";
import { isDomainError } from "@/domain/errors";
import { onBookingCancelled } from "@/domain/notifications/handlers";
import { cancelLimiter } from "@/lib/rate-limit";

export type CancelState = { status: "idle" | "cancelled" | "error"; message?: string };

/**
 * Cancels a booking from the emailed manage link. The token itself is the
 * credential (256-bit, stored hashed). Server Actions are POST-only and
 * Next.js checks Origin vs Host, which covers CSRF.
 */
export async function cancelBookingAction(_prev: CancelState, formData: FormData): Promise<CancelState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (!cancelLimiter(`cancel:${ip}`).ok) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const token = String(formData.get("token") ?? "");
  try {
    const cancelled = await cancelBookingByToken(token);
    after(() => onBookingCancelled(cancelled));
    refresh();
    return { status: "cancelled" };
  } catch (err) {
    if (isDomainError(err)) return { status: "error", message: err.message };
    console.error("[cancel] unexpected error", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}
