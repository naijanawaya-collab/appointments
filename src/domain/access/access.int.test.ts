import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { members } from "@/db/schema";
import { createShop, createUser, resetDb, type Shop } from "../../../tests/support/fixtures";
import { getAccess, getAccessBySlug, listMyShops } from "./access";
import { hasRole } from "./roles";

/** The authorization matrix (MVP-PLAN M4 tests): who reaches which shop with which role. */

let a: Shop;
let b: Shop;
let staffUser: string;
const actor = (userId: string, email = `${userId}@test.dev`) => ({ userId, email });

beforeEach(async () => {
  await resetDb();
  a = await createShop({ slug: "shop-a" });
  b = await createShop({ slug: "shop-b" });
  staffUser = await createUser("staff-a@test.dev", "Staff");
  await db.insert(members).values({ businessId: a.business.id, userId: staffUser, role: "staff" });
});

afterEach(() => {
  delete process.env.PLATFORM_ADMIN_EMAILS;
});

afterAll(resetDb);

describe("authorization matrix", () => {
  it("an owner of shop A is owner there and has no access to shop B", async () => {
    expect((await getAccess(actor(a.ownerId), a.business.id))?.role).toBe("owner");
    expect(await getAccess(actor(a.ownerId), b.business.id)).toBeNull();
    expect(await getAccessBySlug(actor(a.ownerId), "shop-b")).toBeNull();
  });

  it("staff of shop A can do staff things but not owner things", async () => {
    const access = await getAccess(actor(staffUser, "staff-a@test.dev"), a.business.id);
    expect(access?.role).toBe("staff");
    expect(hasRole(access!.role, "staff")).toBe(true);
    expect(hasRole(access!.role, "owner")).toBe(false);
    expect(await getAccess(actor(staffUser), b.business.id)).toBeNull();
  });

  it("a signed-in user with no membership has no access", async () => {
    const stranger = await createUser("nobody@test.dev");
    expect(await getAccess(actor(stranger, "nobody@test.dev"), a.business.id)).toBeNull();
    expect(await listMyShops(stranger)).toEqual([]);
  });

  it("operators (PLATFORM_ADMIN_EMAILS) act as owners of every shop", async () => {
    const op = await createUser("ops@platform.test");
    process.env.PLATFORM_ADMIN_EMAILS = "someone@else.test, OPS@platform.test";
    const access = await getAccessBySlug(actor(op, "ops@platform.test"), "shop-b");
    expect(access).toMatchObject({ role: "owner", viaOperator: true });
  });

  it("unknown shops resolve to no access (no existence leak)", async () => {
    expect(await getAccessBySlug(actor(a.ownerId), "does-not-exist")).toBeNull();
    expect(await getAccess(actor(a.ownerId), "00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("lists only the user's own shops in the switcher", async () => {
    await db.insert(members).values({ businessId: b.business.id, userId: a.ownerId, role: "staff" });
    const shops = await listMyShops(a.ownerId);
    expect(shops.map((s) => [s.slug, s.role])).toEqual([
      ["shop-a", "owner"],
      ["shop-b", "staff"],
    ]);
  });
});
