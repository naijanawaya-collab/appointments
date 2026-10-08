/**
 * Cloudinary signed uploads – server only (uses the API secret).
 *
 * Flow: the admin asks us for a signature scoped to its own tenant folder,
 * uploads the file straight to Cloudinary (no server bandwidth, real progress
 * bar), then sends us Cloudinary's response, whose signature we verify
 * before trusting any of it.
 */
import { createHash } from "node:crypto";

export const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type CloudinaryEnv = { cloudName: string; apiKey: string; apiSecret: string };

export function cloudinaryEnv(): CloudinaryEnv | null {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export const tenantFolder = (businessId: string) => `tenants/${businessId}`;

/** Cloudinary's signing rule: sha1 of sorted "k=v" pairs joined by & + secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== undefined)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

export type UploadSignature = {
  uploadUrl: string;
  fields: Record<string, string>;
};

export function createUploadSignature(env: CloudinaryEnv, businessId: string, now = Date.now()): UploadSignature {
  const params = {
    allowed_formats: ALLOWED_FORMATS.join(","),
    folder: tenantFolder(businessId),
    timestamp: Math.floor(now / 1000),
  };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${env.cloudName}/image/upload`,
    fields: {
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      api_key: env.apiKey,
      signature: signParams(params, env.apiSecret),
    },
  };
}

export type UploadResult = {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

/**
 * Trust an upload response only if Cloudinary signed it, it's in this
 * tenant's folder and within our limits.
 */
export function verifyUpload(
  env: CloudinaryEnv,
  businessId: string,
  r: UploadResult,
): { ok: true } | { ok: false; reason: string } {
  const expected = createHash("sha1")
    .update(`public_id=${r.public_id}&version=${r.version}${env.apiSecret}`)
    .digest("hex");
  if (expected !== r.signature) return { ok: false, reason: "Invalid upload signature" };
  if (!r.public_id.startsWith(`${tenantFolder(businessId)}/`)) return { ok: false, reason: "Wrong folder" };
  if (r.bytes > MAX_UPLOAD_BYTES) return { ok: false, reason: "File is larger than 10 MB" };
  return { ok: true };
}

/** Deletes an asset. Never throws: an orphaned file is not worth failing a request. */
export async function destroyAsset(env: CloudinaryEnv, publicId: string): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp };
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: env.apiKey,
    signature: signParams(params, env.apiSecret),
  });
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${env.cloudName}/image/destroy`, { method: "POST", body });
  } catch (err) {
    console.error("[cloudinary] destroy failed", err);
  }
}
