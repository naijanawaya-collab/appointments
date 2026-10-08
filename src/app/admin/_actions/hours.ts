"use server";

import { addClosure, removeClosure, setOpeningHours } from "@/domain/hours/admin";
import type { HoursRange } from "@/domain/hours/edit";
import { listStaff, setWorkingHours } from "@/domain/team/admin";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { closureSchema, hoursSchema, type ClosureFormInput } from "@/validation/admin";
import { changed } from "./shared";

/** `applyToTeam`: also give every active professional these hours. */
export async function saveOpeningHoursAction(businessId: string, raw: HoursRange[], applyToTeam: boolean) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const ranges = hoursSchema.parse(raw);
    await setOpeningHours(businessId, ranges);
    if (applyToTeam) {
      for (const member of await listStaff(businessId)) {
        if (member.isActive) await setWorkingHours(businessId, member.id, ranges);
      }
    }
    changed(businessId);
    return null;
  }, applyToTeam ? "Opening hours saved and applied to the team." : "Opening hours saved.");
}

export async function addClosureAction(businessId: string, raw: ClosureFormInput) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await addClosure(businessId, closureSchema.parse(raw));
    changed(businessId);
    return null;
  }, "Closure added.");
}

export async function removeClosureAction(businessId: string, closureId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await removeClosure(businessId, closureId);
    changed(businessId);
    return null;
  });
}
