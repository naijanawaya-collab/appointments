"use server";

import { after } from "next/server";
import { z } from "zod";
import { cloudinaryEnv, destroyAsset } from "@/domain/media/cloudinary";
import { deleteMedia, updateMedia } from "@/domain/media/service";
import { discardDraft, publishDraft, removeMediaReferences, saveDraft } from "@/domain/storefront/service";
import { DomainError } from "@/domain/errors";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { invalidateBusiness } from "@/lib/tenant";

/**
 * Storefront editor actions. Every one re-checks that the caller owns the
 * shop: Server Actions are plain POST endpoints, so the page check alone
 * is never enough.
 *
 * Drafts are only visible in the owner's preview, so saving one doesn't
 * touch the public cache. Publishing (and photo edits, which apply to the
 * live page too) invalidate the shop's cached pages.
 */

const id = z.uuid();

export async function saveDraftAction(businessId: string, config: unknown) {
  return runAction(async () => {
    const ctx = await authorize(id.parse(businessId), "owner");
    await saveDraft(ctx.business.id, ctx.userId, config);
    return { savedAt: new Date().toISOString() };
  });
}

export async function publishStorefrontAction(businessId: string) {
  return runAction(async () => {
    const ctx = await authorize(id.parse(businessId), "owner");
    const result = await publishDraft(ctx.business.id, ctx.userId);
    if (!result.ok) throw new DomainError("INVALID_INPUT", result.issues.join(" "));
    invalidateBusiness(ctx.business.id);
    return { publishedAt: new Date().toISOString() };
  }, "Published. Your storefront is live.");
}

export async function discardDraftAction(businessId: string) {
  return runAction(async () => {
    const ctx = await authorize(id.parse(businessId), "owner");
    return discardDraft(ctx.business.id, ctx.userId);
  });
}

export async function updateMediaAction(businessId: string, mediaId: string, input: unknown) {
  return runAction(async () => {
    const ctx = await authorize(id.parse(businessId), "owner");
    const updated = await updateMedia(ctx.business.id, id.parse(mediaId), input);
    invalidateBusiness(ctx.business.id);
    return updated;
  });
}

export async function deleteMediaAction(businessId: string, mediaId: string) {
  return runAction(async () => {
    const ctx = await authorize(id.parse(businessId), "owner");
    const mid = id.parse(mediaId);
    const publicId = await deleteMedia(ctx.business.id, mid);
    await removeMediaReferences(ctx.business.id, mid);
    invalidateBusiness(ctx.business.id);
    const env = cloudinaryEnv();
    // The row is gone (pages stop showing it); the file is removed after the response.
    if (publicId && env) after(() => destroyAsset(env, publicId));
    return null;
  });
}
