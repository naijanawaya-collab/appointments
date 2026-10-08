import "server-only";
import { refresh } from "next/cache";
import { invalidateBusiness } from "@/lib/tenant";

/**
 * After every admin change: drop the shop's cached public pages and
 * re-render the admin page the owner is looking at.
 */
export function changed(businessId: string) {
  invalidateBusiness(businessId);
  refresh();
}
