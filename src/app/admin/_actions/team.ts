"use server";

import { addTimeOff, createStaff, deleteStaff, moveStaff, removeTimeOff, setWorkingHours, updateStaff } from "@/domain/team/admin";
import type { HoursRange } from "@/domain/hours/edit";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { hoursSchema, staffSchema, timeOffSchema, type StaffFormInput, type TimeOffFormInput } from "@/validation/admin";
import { changed } from "./shared";

export async function saveStaffAction(businessId: string, staffId: string | null, raw: StaffFormInput) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const input = staffSchema.parse(raw);
    const row = staffId ? await updateStaff(businessId, staffId, input) : await createStaff(businessId, input);
    changed(businessId);
    return { id: row.id };
  }, "Saved.");
}

export async function deleteStaffAction(businessId: string, staffId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await deleteStaff(businessId, staffId);
    changed(businessId);
    return null;
  });
}

export async function moveStaffAction(businessId: string, staffId: string, direction: "up" | "down") {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await moveStaff(businessId, staffId, direction);
    changed(businessId);
    return null;
  });
}

export async function saveWorkingHoursAction(businessId: string, staffId: string, raw: HoursRange[]) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await setWorkingHours(businessId, staffId, hoursSchema.parse(raw));
    changed(businessId);
    return null;
  }, "Working hours saved.");
}

export async function addTimeOffAction(businessId: string, staffId: string, raw: TimeOffFormInput) {
  return runAction(async () => {
    const ctx = await authorize(businessId, "owner");
    await addTimeOff(businessId, ctx.business.timezone, staffId, timeOffSchema.parse(raw));
    changed(businessId);
    return null;
  }, "Time off added.");
}

export async function removeTimeOffAction(businessId: string, timeOffId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await removeTimeOff(businessId, timeOffId);
    changed(businessId);
    return null;
  });
}
