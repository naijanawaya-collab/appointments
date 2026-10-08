/** Browser-side API calls for the booking flow (used with React Query). */
import type { Slot } from "@/domain/availability/compute-slots";
import type { BookingRequest } from "@/validation/booking";
import type { Confirmation } from "./wizard-state";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  } catch {
    throw new ApiError(0, "NETWORK", "Something went wrong. Try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN",
      res.status >= 500 ? "Something went wrong. Try again." : (body?.error?.message ?? "Something went wrong. Try again."),
      body?.error?.fieldErrors ?? {},
    );
  }
  return body as T;
}

export type NextAvailable = { date: string; time: string; start: string; label: string };
export type AvailabilityResponse = {
  date: string;
  timezone: string;
  durationMin: number;
  slots: Slot[];
  nextAvailable: NextAvailable | null;
};
export type DaysResponse = { days: { date: string; closed: boolean }[] };

export function fetchAvailability(p: { businessId: string; date: string; serviceIds: string[]; staffId: string }) {
  const qs = new URLSearchParams({ date: p.date, services: p.serviceIds.join(","), staff: p.staffId });
  return request<AvailabilityResponse>(`/api/businesses/${p.businessId}/availability?${qs}`);
}

export const fetchDays = (businessId: string, days: number) =>
  request<DaysResponse>(`/api/businesses/${businessId}/days?days=${days}`);

export const createBookingRequest = (businessId: string, body: BookingRequest, idempotencyKey: string) =>
  request<Confirmation>(`/api/businesses/${businessId}/bookings`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "idempotency-key": idempotencyKey },
  });

export const availabilityKey = (businessId: string, date: string | null, serviceIds: string[], staffId: string) =>
  ["availability", businessId, date, [...serviceIds].sort().join(","), staffId] as const;

/** URL-safe random key for one booking attempt (B-18). */
export function newIdempotencyKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
