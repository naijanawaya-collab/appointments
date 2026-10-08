/**
 * Media library operations, always scoped to one business.
 */
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { media } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import { cloudinaryEnv, destroyAsset, verifyUpload, type UploadResult } from "./cloudinary";
import { toMediaView } from "./image";

export const uploadResultSchema = z.object({
  public_id: z.string().min(1).max(300),
  version: z.number().int(),
  signature: z.string().min(10).max(80),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  format: z.string().max(10),
});

export const mediaUpdateSchema = z.object({
  alt: z.string().trim().max(200).optional(),
  focalX: z.number().min(0).max(100).optional(),
  focalY: z.number().min(0).max(100).optional(),
});

export async function listMedia(businessId: string) {
  const rows = await db.select().from(media).where(eq(media.businessId, businessId)).orderBy(desc(media.createdAt));
  return rows.map((r) => ({ ...toMediaView(r), focalX: r.focalX, focalY: r.focalY, bytes: r.bytes, format: r.format }));
}

export async function createMediaFromUpload(businessId: string, input: UploadResult, alt = "") {
  const env = cloudinaryEnv();
  if (!env) throw new DomainError("INVALID_SELECTION", "Image uploads aren't configured yet.");
  const check = verifyUpload(env, businessId, input);
  if (!check.ok) {
    // Clean up anything that reached Cloudinary but that we won't keep.
    if (input.public_id.startsWith(`tenants/${businessId}/`)) await destroyAsset(env, input.public_id);
    throw new DomainError("INVALID_SELECTION", check.reason);
  }
  const [row] = await db
    .insert(media)
    .values({
      businessId,
      provider: "cloudinary",
      publicId: input.public_id,
      width: input.width,
      height: input.height,
      bytes: input.bytes,
      format: input.format,
      alt: alt.trim().slice(0, 200),
    })
    .returning();
  return { ...toMediaView(row), focalX: row.focalX, focalY: row.focalY, bytes: row.bytes, format: row.format };
}

export async function updateMedia(businessId: string, mediaId: string, input: unknown) {
  const data = mediaUpdateSchema.parse(input);
  const [row] = await db
    .update(media)
    .set(data)
    .where(and(eq(media.id, mediaId), eq(media.businessId, businessId)))
    .returning();
  if (!row) throw new DomainError("INVALID_SELECTION", "Photo not found.");
  return { ...toMediaView(row), focalX: row.focalX, focalY: row.focalY, bytes: row.bytes, format: row.format };
}

/** Deletes the row now and the Cloudinary file in the background. */
export async function deleteMedia(businessId: string, mediaId: string): Promise<string | null> {
  const [row] = await db
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.businessId, businessId)))
    .returning();
  if (!row) throw new DomainError("INVALID_SELECTION", "Photo not found.");
  return row.provider === "cloudinary" ? row.publicId : null;
}
