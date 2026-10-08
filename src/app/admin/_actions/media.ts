"use server";

import { cloudinaryEnv, createUploadSignature, type UploadResult } from "@/domain/media/cloudinary";
import { createMediaFromUpload, uploadResultSchema } from "@/domain/media/service";
import { DomainError } from "@/domain/errors";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";

/** Signed, tenant-scoped Cloudinary upload parameters (the browser uploads directly). */
export async function signUploadAction(businessId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const env = cloudinaryEnv();
    if (!env) throw new DomainError("CONFLICT", "Photo uploads aren't set up yet (Cloudinary keys missing).");
    return createUploadSignature(env, businessId);
  });
}

/** Verifies Cloudinary's signed response and records the photo. */
export async function saveUploadAction(businessId: string, raw: UploadResult, alt = "") {
  return runAction(async () => {
    await authorize(businessId, "owner");
    return createMediaFromUpload(businessId, uploadResultSchema.parse(raw), String(alt).slice(0, 200));
  });
}
