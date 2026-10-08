"use server";

import { unstable_cache } from "next/cache";
import { addReview, ensureMember, listMembers, removeMember, removeReview, updateBusinessDetails } from "@/domain/business/admin";
import { geocodeAddress } from "@/domain/business/geocode";
import { DomainError } from "@/domain/errors";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { sendInvite } from "@/lib/invites";
import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/platform";
import { businessDetailsSchema, inviteSchema, reviewSchema, type BusinessDetailsFormInput, type InviteFormInput, type ReviewFormInput } from "@/validation/admin";
import { changed } from "./shared";

export async function saveDetailsAction(businessId: string, raw: BusinessDetailsFormInput) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await updateBusinessDetails(businessId, businessDetailsSchema.parse(raw));
    changed(businessId);
    return null;
  }, "Shop details saved.");
}

/** Same address → same answer for a month (and Nominatim's 1 req/s policy). */
const cachedGeocode = unstable_cache(
  (address: string) => geocodeAddress(address, { userAgent: `${PLATFORM_NAME}/1.0 (+${PLATFORM_URL})` }),
  ["geocode"],
  { revalidate: 60 * 60 * 24 * 30 },
);

export async function geocodeAction(businessId: string, address: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const hit = await cachedGeocode(address.trim().slice(0, 200)).catch(() => null);
    if (!hit) throw new DomainError("NOT_FOUND", "We couldn't find that address. Check it, or enter the coordinates by hand.");
    return hit;
  });
}

export async function addReviewAction(businessId: string, raw: ReviewFormInput) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await addReview(businessId, reviewSchema.parse(raw));
    changed(businessId);
    return null;
  }, "Review added.");
}

export async function removeReviewAction(businessId: string, reviewId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await removeReview(businessId, reviewId);
    changed(businessId);
    return null;
  });
}

export async function inviteMemberAction(businessId: string, raw: InviteFormInput) {
  return runAction(async () => {
    const ctx = await authorize(businessId, "owner");
    const input = inviteSchema.parse(raw);
    const member = await ensureMember(businessId, input);
    const { url } = await sendInvite({ userId: member.userId, email: input.email, shopName: ctx.business.name, inviterName: ctx.name, role: input.role });
    changed(businessId);
    return { url };
  }, "Invite sent.");
}

export async function resendInviteAction(businessId: string, userId: string) {
  return runAction(async () => {
    const ctx = await authorize(businessId, "owner");
    const member = (await listMembers(businessId)).find((m) => m.userId === userId);
    if (!member) throw new DomainError("NOT_FOUND", "Person not found.");
    const { url } = await sendInvite({ userId, email: member.email, shopName: ctx.business.name, inviterName: ctx.name, role: member.role });
    return { url };
  }, "Invite sent again.");
}

export async function removeMemberAction(businessId: string, memberId: string) {
  return runAction(async () => {
    const ctx = await authorize(businessId, "owner");
    const member = (await listMembers(businessId)).find((m) => m.id === memberId);
    if (member?.userId === ctx.userId) throw new DomainError("CONFLICT", "You can't remove yourself. Ask another owner.");
    await removeMember(businessId, memberId);
    changed(businessId);
    return null;
  });
}

