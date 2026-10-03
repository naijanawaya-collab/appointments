/** Browser-side API calls for the booking flow (used with React Query). */
import type { Slot } from "@/domain/availability/compute-slots";
import type { Catalog } from "@/domain/catalog/selection";
import type { BookingRequest } from "@/validation/booking";
import type { Confirmation } from "./wizard-state";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? "Something went wrong. Please try again.",
    );
  }
  return body as T;
}

export type AvailabilityResponse = { date: string; timezone: string; durationMin: number; slots: Slot[] };

export const fetchCatalog = (businessId: string) => request<Catalog>(`/api/businesses/${businessId}/catalog`);

export function fetchAvailability(params: {
  businessId: string;
  date: string;
  serviceIds: string[];
  staffId: string;
}) {
  const qs = new URLSearchParams({ date: params.date, services: params.serviceIds.join(","), staff: params.staffId });
  return request<AvailabilityResponse>(`/api/businesses/${params.businessId}/availability?${qs}`);
}

export const createBookingRequest = (businessId: string, body: BookingRequest) =>
  request<Confirmation>(`/api/businesses/${businessId}/bookings`, { method: "POST", body: JSON.stringify(body) });

export const availabilityKey = (businessId: string, date: string | null, serviceIds: string[], staffId: string) =>
  ["availability", businessId, date, [...serviceIds].sort().join(","), staffId] as const;
