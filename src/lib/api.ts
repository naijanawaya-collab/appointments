import "server-only";
import { NextResponse } from "next/server";
import { getActiveBusinessById, resolveBusiness, type Business } from "@/domain/business/resolve-business";
import { isDomainError, type DomainErrorCode } from "@/domain/errors";
import { isPlatformHost } from "./hosts";

/**
 * Loads the business an API request targets and enforces tenant boundaries:
 * on a custom domain (brosbab.com) only that domain's business is reachable,
 * even if someone puts another business's id in the URL.
 */
export async function businessForRequest(request: Request, businessId: string): Promise<Business | null> {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!isPlatformHost(host)) {
    const owner = await resolveBusiness({ hostname: host ?? "" });
    if (!owner || owner.id !== businessId) return null;
    return owner;
  }
  return getActiveBusinessById(businessId);
}

const STATUS: Record<DomainErrorCode, number> = {
  INVALID_SELECTION: 400,
  SLOT_UNAVAILABLE: 409,
  BOOKING_NOT_FOUND: 404,
  CANCELLATION_CLOSED: 409,
  INVALID_STATUS: 409,
};

/** Consistent JSON error shape: { error: { code, message } } */
export function errorResponse(code: string, message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

/** Maps domain errors to HTTP; anything unexpected becomes a generic 500 (details only in logs). */
export function handleRouteError(err: unknown) {
  if (isDomainError(err)) return errorResponse(err.code, err.message, STATUS[err.code]);
  console.error("[api] unexpected error", err);
  return errorResponse("INTERNAL", "Something went wrong. Please try again.", 500);
}
