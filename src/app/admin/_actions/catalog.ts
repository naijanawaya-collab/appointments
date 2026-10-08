"use server";

import {
  createCategory,
  createService,
  deleteCategory,
  deleteService,
  moveCategory,
  moveService,
  renameCategory,
  updateService,
} from "@/domain/catalog/admin";
import { runAction } from "@/lib/action";
import { authorize } from "@/lib/authz";
import { categorySchema, serviceSchema, type ServiceFormInput } from "@/validation/admin";
import { changed } from "./shared";

export async function saveServiceAction(businessId: string, serviceId: string | null, raw: ServiceFormInput) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const input = serviceSchema.parse(raw);
    const row = serviceId ? await updateService(businessId, serviceId, input) : await createService(businessId, input);
    changed(businessId);
    return { id: row.id };
  }, "Service saved.");
}

export async function deleteServiceAction(businessId: string, serviceId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await deleteService(businessId, serviceId);
    changed(businessId);
    return null;
  });
}

export async function moveServiceAction(businessId: string, serviceId: string, direction: "up" | "down") {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await moveService(businessId, serviceId, direction);
    changed(businessId);
    return null;
  });
}

export async function saveCategoryAction(businessId: string, categoryId: string | null, raw: { name: string }) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    const { name } = categorySchema.parse(raw);
    const row = categoryId ? await renameCategory(businessId, categoryId, name) : await createCategory(businessId, name);
    changed(businessId);
    return { id: row.id };
  }, "Category saved.");
}

export async function deleteCategoryAction(businessId: string, categoryId: string) {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await deleteCategory(businessId, categoryId);
    changed(businessId);
    return null;
  });
}

export async function moveCategoryAction(businessId: string, categoryId: string, direction: "up" | "down") {
  return runAction(async () => {
    await authorize(businessId, "owner");
    await moveCategory(businessId, categoryId, direction);
    changed(businessId);
    return null;
  });
}
