import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as s from "@/db/schema";
import { createMediaFromUpload, deleteMedia, listMedia, updateMedia } from "@/domain/media/service";
import { createShop, resetDb, type Shop } from "../../../tests/support/fixtures";
import { defaultConfig } from "./config";
import { discardDraft, getDraftConfig, getStorefront, publishDraft, saveDraft } from "./service";

let shop: Shop;
let userId: string;

beforeAll(() => {
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
});

beforeEach(async () => {
  await resetDb();
  shop = await createShop();
  userId = shop.ownerId;
});

afterAll(resetDb);

const upload = (businessId: string, name: string, bytes = 1000) => {
  const public_id = `tenants/${businessId}/${name}`;
  return {
    public_id,
    version: 1,
    bytes,
    width: 2000,
    height: 1500,
    format: "jpg",
    signature: createHash("sha1").update(`public_id=${public_id}&version=1secret`).digest("hex"),
  };
};

describe("media library", () => {
  it("stores verified uploads and lets the owner set alt + focal point", async () => {
    const m = await createMediaFromUpload(shop.business.id, upload(shop.business.id, "chair"), "Chair");
    expect(m.src).toBe(`https://res.cloudinary.com/demo/image/upload/tenants/${shop.business.id}/chair`);
    const updated = await updateMedia(shop.business.id, m.id, { alt: "Barber chair", focalX: 30, focalY: 70 });
    expect(updated).toMatchObject({ alt: "Barber chair", position: "30% 70%" });
    expect(await listMedia(shop.business.id)).toHaveLength(1);
  });

  it("rejects uploads into another shop's folder", async () => {
    const other = await createShop({ slug: "other" });
    await expect(createMediaFromUpload(shop.business.id, upload(other.business.id, "x"))).rejects.toMatchObject({
      code: "INVALID_SELECTION",
    });
  });

  it("can't edit or delete another shop's photos", async () => {
    const other = await createShop({ slug: "other" });
    const m = await createMediaFromUpload(other.business.id, upload(other.business.id, "y"));
    await expect(updateMedia(shop.business.id, m.id, { alt: "hacked" })).rejects.toThrow();
    await expect(deleteMedia(shop.business.id, m.id)).rejects.toThrow();
  });
});

describe("draft & publish", () => {
  it("keeps draft changes private until published", async () => {
    const m = await createMediaFromUpload(shop.business.id, upload(shop.business.id, "hero"), "Shop front");
    const draft = { ...defaultConfig("modern"), hero: { layout: "full" as const, mediaIds: [m.id] } };
    await saveDraft(shop.business.id, userId, draft);

    expect((await getStorefront(shop.business.id))?.config.preset).toBe("classic");
    expect((await getStorefront(shop.business.id, { draft: true }))?.config.preset).toBe("modern");

    expect(await publishDraft(shop.business.id, userId)).toEqual({ ok: true });
    const published = await getStorefront(shop.business.id);
    expect(published?.config.preset).toBe("modern");
    expect(published?.media[m.id].alt).toBe("Shop front");
  });

  it("refuses photos from another shop in the config", async () => {
    const other = await createShop({ slug: "other" });
    const m = await createMediaFromUpload(other.business.id, upload(other.business.id, "z"), "x");
    await expect(saveDraft(shop.business.id, userId, { ...defaultConfig(), gallery: [m.id] })).rejects.toThrow(/don't belong/);
  });

  it("blocks publishing photos without alt text", async () => {
    const m = await createMediaFromUpload(shop.business.id, upload(shop.business.id, "g"));
    await saveDraft(shop.business.id, userId, { ...defaultConfig(), gallery: [m.id] });
    expect(await publishDraft(shop.business.id, userId)).toEqual({ ok: false, issues: ["1 photo needs a description (alt text)."] });
  });

  it("discards the draft back to the published version", async () => {
    await saveDraft(shop.business.id, userId, defaultConfig("bold"));
    await discardDraft(shop.business.id, userId);
    expect((await getDraftConfig(shop.business.id)).draft.preset).toBe("classic");
  });

  it("drops references to deleted photos when rendering", async () => {
    const m = await createMediaFromUpload(shop.business.id, upload(shop.business.id, "gone"), "x");
    await saveDraft(shop.business.id, userId, { ...defaultConfig(), gallery: [m.id] });
    await publishDraft(shop.business.id, userId);
    await deleteMedia(shop.business.id, m.id);
    expect((await getStorefront(shop.business.id))?.config.gallery).toEqual([]);
  });

  it("returns null for inactive shops", async () => {
    await db.update(s.businesses).set({ isActive: false }).where(eq(s.businesses.id, shop.business.id));
    expect(await getStorefront(shop.business.id)).toBeNull();
  });
});
