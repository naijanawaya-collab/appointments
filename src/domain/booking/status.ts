/**
 * Booking state machine. Every status change in the app goes through
 * `assertTransition`, so illegal jumps (e.g. cancelled -> completed) are
 * impossible no matter which screen triggers them.
 *
 *   pending ──► confirmed ──► completed
 *      │            │    └──► no_show
 *      └────────────┴───────► cancelled
 */
export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "no_show", "cancelled"],
  cancelled: [],
  completed: [],
  no_show: [],
};

/** Statuses that block the time slot (must match the DB exclusion constraint). */
export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid booking status change: ${from} -> ${to}`);
  }
}

/**
 * Domain events. For now `emit` just calls the handlers in-process
 * (send email, sync calendar...). Later the same events can go onto a queue
 * without touching the code that emits them.
 */
export type BookingEvent =
  | { type: "booking.created"; bookingId: string; businessId: string }
  | { type: "booking.cancelled"; bookingId: string; businessId: string }
  | { type: "booking.rescheduled"; bookingId: string; businessId: string };
