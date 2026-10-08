import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createUploadSignature, signParams, verifyUpload, type CloudinaryEnv } from "./cloudinary";
import { imageLoader, sizedUrl, toMediaView } from "./image";

const env: CloudinaryEnv = { cloudName: "demo", apiKey: "123", apiSecret: "shh" };
const BIZ = "11111111-1111-4111-8111-111111111111";

describe("Cloudinary signing", () => {
  it("signs sorted params like Cloudinary does", () => {
    const sig = signParams({ timestamp: 1315060510, public_id: "sample_image", eager: "w_400" }, "abcd");
    expect(sig).toBe(createHash("sha1").update("eager=w_400&public_id=sample_image&timestamp=1315060510abcd").digest("hex"));
  });

  it("scopes upload signatures to the tenant folder", () => {
    const s = createUploadSignature(env, BIZ, 1_700_000_000_000);
    expect(s.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(s.fields.folder).toBe(`tenants/${BIZ}`);
    expect(s.fields.timestamp).toBe("1700000000");
    expect(s.fields.api_key).toBe("123");
    expect(s.fields).not.toHaveProperty("api_secret");
  });

  const signed = (publicId: string, version = 1, bytes = 1000) => ({
    public_id: publicId,
    version,
    bytes,
    width: 100,
    height: 100,
    format: "jpg",
    signature: createHash("sha1").update(`public_id=${publicId}&version=${version}shh`).digest("hex"),
  });

  it("accepts genuine uploads in the tenant folder", () => {
    expect(verifyUpload(env, BIZ, signed(`tenants/${BIZ}/abc`))).toEqual({ ok: true });
  });

  it("rejects forged, foreign-folder and oversized uploads", () => {
    expect(verifyUpload(env, BIZ, { ...signed(`tenants/${BIZ}/abc`), signature: "x" })).toMatchObject({ ok: false });
    expect(verifyUpload(env, BIZ, signed("tenants/other-business/abc"))).toMatchObject({ ok: false, reason: "Wrong folder" });
    expect(verifyUpload(env, BIZ, signed(`tenants/${BIZ}/big`, 1, 11 * 1024 * 1024))).toMatchObject({ ok: false });
  });
});

describe("image URLs", () => {
  it("builds Cloudinary views with focal point", () => {
    const v = toMediaView(
      { id: "m", provider: "cloudinary", publicId: "tenants/x/photo", url: null, width: 800, height: 600, alt: "Chair", focalX: 62.4, focalY: 34 },
      "demo",
    );
    expect(v).toEqual({ id: "m", src: "https://res.cloudinary.com/demo/image/upload/tenants/x/photo", width: 800, height: 600, alt: "Chair", position: "62% 34%" });
  });

  it("refuses unsafe public ids", () => {
    expect(() =>
      toMediaView({ id: "m", provider: "cloudinary", publicId: "a b\"><script>", url: null, width: 1, height: 1, alt: "", focalX: 50, focalY: 50 }, "demo"),
    ).toThrow();
  });

  it("asks Cloudinary for the right width and format", () => {
    expect(imageLoader({ src: "https://res.cloudinary.com/demo/image/upload/tenants/x/photo", width: 800 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/tenants/x/photo",
    );
    expect(sizedUrl("https://res.cloudinary.com/demo/image/upload/p", 1200, "jpg")).toContain("f_jpg,q_auto,c_limit,w_1200");
  });

  it("rewrites Unsplash widths for demo shops", () => {
    const out = imageLoader({ src: "https://images.unsplash.com/photo-1?auto=format&fit=crop&q=70&w=1600", width: 640 });
    expect(new URL(out).searchParams.get("w")).toBe("640");
  });
});
