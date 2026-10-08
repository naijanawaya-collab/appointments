"use server";

import { refresh } from "next/cache";
import { validateSlug } from "@/domain/business/site";
import { createShop, isSlugTaken, setShopActive } from "@/domain/business/admin";
import { runAction } from "@/lib/action";
import { authorizeOperator } from "@/lib/authz";
import { sendInvite } from "@/lib/invites";
import { invalidateBusiness } from "@/lib/tenant";
import { createShopSchema, type CreateShopFormInput } from "@/validation/admin";

/**
 * Operator: create a shop and invite its owner. The invite link is also
 * returned so it can be shared by hand (e.g. before email is set up).
 */
export async function createShopAction(raw: CreateShopFormInput) {
  return runAction(async () => {
    const operator = await authorizeOperator();
    const input = createShopSchema.parse(raw);
    const { business, owner } = await createShop(input);
    const { url } = await sendInvite({ userId: owner.userId, email: input.ownerEmail, shopName: business.name, inviterName: operator.name, role: "owner" });
    refresh();
    return { slug: business.slug, inviteUrl: url };
  }, "Shop created and the owner invited.");
}

export async function checkSlugAction(slug: string) {
  return runAction(async () => {
    await authorizeOperator();
    const value = slug.trim().toLowerCase();
    const problem = validateSlug(value) ?? ((await isSlugTaken(value)) ? "That address is taken. Pick another." : null);
    return { problem };
  });
}

export async function setShopActiveAction(businessId: string, isActive: boolean) {
  return runAction(async () => {
    await authorizeOperator();
    await setShopActive(businessId, isActive);
    invalidateBusiness(businessId);
    refresh();
    return null;
  });
}
