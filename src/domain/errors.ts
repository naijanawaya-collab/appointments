/**
 * Domain errors. Route handlers map `code` to HTTP status codes; UI maps it
 * to friendly copy. Keep messages safe to show to customers.
 */
export type DomainErrorCode =
  | "INVALID_SELECTION"
  | "SLOT_UNAVAILABLE"
  | "BOOKING_NOT_FOUND"
  | "CANCELLATION_CLOSED"
  | "INVALID_STATUS"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT";

export class DomainError extends Error {
  constructor(
    public readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const isDomainError = (e: unknown): e is DomainError => e instanceof DomainError;

/** Walks wrapped errors (Drizzle wraps driver errors in `cause`) to find a Postgres SQLSTATE. */
export function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** SQLSTATE raised by the bookings_no_overlap_per_staff exclusion constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";
export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
