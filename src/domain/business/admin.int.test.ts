import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, storefrontConfigs } from "@/db/schema";
import { getAccess } from "@/domain/access/access";
import { parseConfig } from "@/domain/storefront/config";
import { businessDetailsSchema, createShopSchema } from "@/validation/admin";
import { createShop as createFixtureShop, resetDb, type Shop } from "../../../tests/support/fixtures";
import { addReview, createShop, ensureMember, listAllShops, listMembers, listReviews, removeMember, removeReview, updateBusinessDetails } from "./admin";

let a: Shop;

beforeEach(async () => {
  await resetDb();
  a = await createFixtureShop({ slug: "shop-a" });
});
afterAll(resetDb);

const shopInput = (overrides: Record<string, unknown> = {}) =>
  createShopSchema.parse({
    name: "Mba Cutz Hair Studio",
    slug: "mbacutz",
    preset: "bold",
    category: "barber",
    timezone: "Europe/Vienna",
    ownerEmail: "Owner@MbaCutz.com",
    ownerName: "Mba",
    ...overrides,
  });

describe("operator: create shop", () => {
  it("creates the business, its storefront from the preset and an owner login", async () => {
    const { business, owner } = await createShop(shopInput());
    expect(business).toMatchObject({ slug: "mbacutz", mark: "M", timezone: "Europe/Vienna" });
    const [config] = await db.select().from(storefrontConfigs).where(eq(storefrontConfigs.businessId, business.id));
    expect(parseConfig(config.published).preset).toBe("bold");
    expect(owner.isNewUser).toBe(true);
    expect((await getAccess({ userId: owner.userId, email: "owner@mbacutz.com" }, business.id))?.role).toBe("owner");
    expect((await listAllShops()).find((s) => s.slug === "mbacutz")?.owners).toEqual(["owner@mbacutz.com"]);
  });

  it("refuses a taken address", async () => {
    await expect(createShop(shopInput({ slug: "shop-a" }))).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("validates reserved and malformed slugs before touching the DB", () => {
    expect(createShopSchema.safeParse({ ...shopInput(), slug: "admin" }).success).toBe(false);
    expect(createShopSchema.safeParse({ ...shopInput(), slug: "Bad Slug" }).success).toBe(false);
  });
});

describe("people", () => {
  it("invites reuse existing logins and update the role", async () => {
    const first = await ensureMember(a.business.id, { email: "sam@shop.test", name: "Sam", role: "staff" });
    const again = await ensureMember(a.business.id, { email: "SAM@shop.test", name: "Sam", role: "owner" });
    expect(again).toMatchObject({ userId: first.userId, isNewUser: false });
    expect((await listMembers(a.business.id)).find((m) => m.email === "sam@shop.test")?.role).toBe("owner");
  });

  it("never removes the last owner", async () => {
    const [owner] = await listMembers(a.business.id);
    await expect(removeMember(a.business.id, owner.id)).rejects.toMatchObject({ code: "CONFLICT" });
    const sam = await ensureMember(a.business.id, { email: "sam@shop.test", name: "Sam", role: "staff" });
    await removeMember(a.business.id, sam.memberId);
    expect(await listMembers(a.business.id)).toHaveLength(1);
  });
});

describe("details and reviews", () => {
  it("saves details (handles, rating, rules)", async () => {
    const input = businessDetailsSchema.parse({
      name: "Shop A", shortName: "A", mark: "A", eyebrow: "", tagline: "Cuts", description: "", aboutTitle: "", about: "",
      address: "Josefstädter Straße 21, 1080 Wien", lat: "48.21", lon: "16.35", phone: "+43 1 234567", email: "hi@a.test",
      whatsapp: "+43", instagram: "https://instagram.com/shop.a/", tiktok: "@shop.a", ratingValue: "4,8", ratingCount: "120",
      legalNotice: "", timezone: "Europe/Vienna", slotIntervalMin: "30", minLeadTimeMin: "120", maxAdvanceDays: "30", cancellationWindowHours: "12",
    });
    await updateBusinessDetails(a.business.id, input);
    const [row] = await db.select().from(businesses).where(eq(businesses.id, a.business.id));
    expect(row).toMatchObject({ instagram: "shop.a", tiktok: "shop.a", whatsapp: null, ratingValue: 4.8, slotIntervalMin: 30, lat: 48.21 });
  });

  it("adds and removes reviews within the shop", async () => {
    const r = await addReview(a.business.id, { quote: "Great fade", author: "Jo", source: "Google" });
    expect(await listReviews(a.business.id)).toHaveLength(1);
    const other = await createFixtureShop({ slug: "shop-b" });
    await expect(removeReview(other.business.id, r.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await removeReview(a.business.id, r.id);
    expect(await listReviews(a.business.id)).toHaveLength(0);
  });
});
