"use server";

import { after } from "next/server";
import { z } from "zod";
import { getAvailability } from "@/domain/availability/get-availability";
import { parseLocalDate } from "@/domain/availability/compute-slots";
import { cancelBookingByShop, setBookingOutcome, setInternalNote } from "@/domain/booking/admin";
import { createBooking } from "@/domain/booking/create-booking";
import { DomainError } from "@/domain/errors";
import { onBookingCancelled, onBookingCreated } from "@/domain/notifications/handlers";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { publicShopUrl } from "@/lib/shop-url";
import { cancelBookingSchema, internalNoteSchema, walkInSchema, type WalkInFormInput } from "@/validation/admin";
import { idempotencyKeySchema } from "@/validation/booking";
import { changed } from "./shared";

export async function cancelBookingAdminAction(businessId: string, bookingId: string, raw: { reason: string; notify: boolean }) {
  return runAction(async () => {
    await authorize(businessId, "staff");
    const input = cancelBookingSchema.parse(raw);
    const details = await cancelBookingByShop(businessId, bookingId, { reason: input.reason });
    if (input.notify) after(() => onBookingCancelled(details, { customer: true, owner: false }));
    changed(businessId);
    return null;
  }, "Booking cancelled.");
}

export async function setOutcomeAction(businessId: string, bookingId: string, to: "completed" | "no_show") {
  return runAction(async () => {
    await authorize(businessId, "staff");
    await setBookingOutcome(businessId, bookingId, z.enum(["completed", "no_show"]).parse(to));
    changed(businessId);
    return null;
  }, to === "completed" ? "Marked as completed." : "Marked as no-show.");
}

export async function saveInternalNoteAction(businessId: string, bookingId: string, raw: { note: string }) {
  return runAction(async () => {
    await authorize(businessId, "staff");
    await setInternalNote(businessId, bookingId, internalNoteSchema.parse(raw).note);
    changed(businessId);
    return null;
  }, "Note saved.");
}

const slotsQuery = z.object({
  date: z.string().refine((d) => parseLocalDate(d) !== null, "Pick a date"),
  serviceIds: z.array(z.uuid()).min(1).max(5),
  staffId: z.union([z.literal("any"), z.uuid()]),
});

/** Free times for a walk-in / phone booking (the online lead time doesn't apply). */
export async function walkInSlotsAction(businessId: string, raw: z.input<typeof slotsQuery>) {
  return runAction(async () => {
    await authorize(businessId, "staff");
    const q = slotsQuery.parse(raw);
    const { slots } = await getAvailability({ businessId, ...q, ignoreLeadTime: true });
    return slots;
  });
}

export async function createWalkInAction(businessId: string, raw: WalkInFormInput, idempotencyKey: string) {
  return runAction(async () => {
    const ctx = await authorize(businessId, "staff");
    const input = walkInSchema.parse(raw);
    if (!idempotencyKeySchema.safeParse(idempotencyKey).success) throw new DomainError("INVALID_INPUT", "Please reload the page and try again.");
    const result = await createBooking({
      businessId,
      timezone: ctx.business.timezone,
      serviceIds: input.serviceIds,
      staffId: input.staffId,
      startsAt: input.startsAt,
      customer: { name: input.name, email: input.email, phone: input.phone },
      customerNote: input.note,
      source: input.source,
      idempotencyKey,
      ignoreLeadTime: true,
    });
    if (input.email && !result.replayed) {
      const manageUrl = await publicShopUrl(ctx.business, `/b/${result.manageToken}`);
      after(() => onBookingCreated(result.bookingId, manageUrl, { customer: true, owner: false }));
    }
    changed(businessId);
    return { bookingId: result.bookingId };
  }, "Booking added.");
}
