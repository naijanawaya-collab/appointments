/**
 * Owner-side catalogue management: categories and services. Every query is
 * scoped by businessId; ids from another shop simply aren't found.
 */
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { media, serviceCategories, services, staff, staffServices } from "@/db/schema";
import { DomainError } from "@/domain/errors";
import type { ServiceInput } from "@/validation/admin";

export type AdminService = typeof services.$inferSelect & { staffIds: string[] };
export type AdminCategory = typeof serviceCategories.$inferSelect;

export async function listCategories(businessId: string): Promise<AdminCategory[]> {
  return db
    .select()
    .from(serviceCategories)
    .where(eq(serviceCategories.businessId, businessId))
    .orderBy(asc(serviceCategories.position), asc(serviceCategories.name));
}

/** All services (active and hidden) with who performs them. */
export async function listServices(businessId: string): Promise<AdminService[]> {
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.businessId, businessId))
    .orderBy(asc(services.sortOrder), asc(services.name));
  const links = rows.length
    ? await db.select().from(staffServices).where(inArray(staffServices.serviceId, rows.map((r) => r.id)))
    : [];
  return rows.map((r) => ({ ...r, staffIds: links.filter((l) => l.serviceId === r.id).map((l) => l.staffId) }));
}

export async function getService(businessId: string, serviceId: string): Promise<AdminService> {
  const [row] = await db.select().from(services).where(and(eq(services.id, serviceId), eq(services.businessId, businessId)));
  if (!row) throw new DomainError("NOT_FOUND", "Service not found.");
  const links = await db.select().from(staffServices).where(eq(staffServices.serviceId, serviceId));
  return { ...row, staffIds: links.map((l) => l.staffId) };
}

/** Ids must all belong to this business. */
async function assertOwn<T extends { id: string }>(label: string, businessId: string, ids: string[], load: (ids: string[]) => Promise<T[]>) {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const rows = await load(unique);
  if (rows.length !== unique.length) throw new DomainError("INVALID_INPUT", `Some ${label} don't belong to this shop.`);
}

const ownStaff = (businessId: string, ids: string[]) =>
  assertOwn("professionals", businessId, ids, (u) =>
    db.select({ id: staff.id }).from(staff).where(and(eq(staff.businessId, businessId), inArray(staff.id, u))),
  );

const ownCategory = async (businessId: string, categoryId: string | null) => {
  if (!categoryId) return;
  const [row] = await db
    .select({ id: serviceCategories.id })
    .from(serviceCategories)
    .where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.businessId, businessId)));
  if (!row) throw new DomainError("INVALID_INPUT", "That category doesn't exist.");
};

export async function createCategory(businessId: string, name: string) {
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${serviceCategories.position}) + 1, 0)::int` })
    .from(serviceCategories)
    .where(eq(serviceCategories.businessId, businessId));
  const [row] = await db.insert(serviceCategories).values({ businessId, name, position: next }).returning();
  return row;
}

export async function renameCategory(businessId: string, categoryId: string, name: string) {
  const [row] = await db
    .update(serviceCategories)
    .set({ name })
    .where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.businessId, businessId)))
    .returning();
  if (!row) throw new DomainError("NOT_FOUND", "Category not found.");
  return row;
}

/** Services in a deleted category become uncategorised (FK set null). */
export async function deleteCategory(businessId: string, categoryId: string) {
  const rows = await db
    .delete(serviceCategories)
    .where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.businessId, businessId)))
    .returning({ id: serviceCategories.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Category not found.");
}

/**
 * Moves one row up or down by swapping positions with its neighbour, then
 * renumbers 0…n so positions stay dense. Shared by categories, services, staff.
 */
async function move<T extends { id: string }>(
  rows: T[],
  id: string,
  direction: "up" | "down",
  write: (id: string, position: number) => Promise<unknown>,
) {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) throw new DomainError("NOT_FOUND", "Not found.");
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= rows.length) return;
  const order = [...rows];
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((r, position) => write(r.id, position)));
}

export async function moveCategory(businessId: string, categoryId: string, direction: "up" | "down") {
  const rows = await listCategories(businessId);
  await db.transaction(async (tx) =>
    move(rows, categoryId, direction, (id, position) =>
      tx.update(serviceCategories).set({ position }).where(and(eq(serviceCategories.id, id), eq(serviceCategories.businessId, businessId))),
    ),
  );
}

/** Reorders within the service's own category (that's how the menu is shown). */
export async function moveService(businessId: string, serviceId: string, direction: "up" | "down") {
  const all = await db
    .select({ id: services.id, categoryId: services.categoryId })
    .from(services)
    .where(eq(services.businessId, businessId))
    .orderBy(asc(services.sortOrder), asc(services.name));
  const target = all.find((r) => r.id === serviceId);
  if (!target) throw new DomainError("NOT_FOUND", "Service not found.");
  const siblings = all.filter((r) => r.categoryId === target.categoryId);
  const i = siblings.indexOf(target);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= siblings.length) return;
  // Swap the two in the full list, then renumber everything densely.
  const order = [...all];
  const a = order.indexOf(siblings[i]);
  const b = order.indexOf(siblings[j]);
  [order[a], order[b]] = [order[b], order[a]];
  await db.transaction(async (tx) => {
    for (const [sortOrder, r] of order.entries()) {
      await tx.update(services).set({ sortOrder }).where(and(eq(services.id, r.id), eq(services.businessId, businessId)));
    }
  });
}

async function assertOwnMedia(businessId: string, mediaId: string | null) {
  if (!mediaId) return;
  const [row] = await db.select({ id: media.id }).from(media).where(and(eq(media.id, mediaId), eq(media.businessId, businessId)));
  if (!row) throw new DomainError("INVALID_INPUT", "That photo doesn't belong to this shop.");
}

export async function createService(businessId: string, input: ServiceInput) {
  await Promise.all([ownCategory(businessId, input.categoryId), ownStaff(businessId, input.staffIds), assertOwnMedia(businessId, input.imageMediaId)]);
  return db.transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${services.sortOrder}) + 1, 0)::int` })
      .from(services)
      .where(eq(services.businessId, businessId));
    const [row] = await tx
      .insert(services)
      .values({
        businessId,
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        durationMin: input.durationMin,
        bufferMin: input.bufferMin,
        priceCents: input.price,
        isActive: input.isActive,
        imageMediaId: input.imageMediaId,
        sortOrder: next,
      })
      .returning();
    if (input.staffIds.length) {
      await tx.insert(staffServices).values([...new Set(input.staffIds)].map((staffId) => ({ staffId, serviceId: row.id })));
    }
    return row;
  });
}

export async function updateService(businessId: string, serviceId: string, input: ServiceInput) {
  await Promise.all([ownCategory(businessId, input.categoryId), ownStaff(businessId, input.staffIds), assertOwnMedia(businessId, input.imageMediaId)]);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(services)
      .set({
        name: input.name,
        description: input.description,
        categoryId: input.categoryId,
        durationMin: input.durationMin,
        bufferMin: input.bufferMin,
        priceCents: input.price,
        isActive: input.isActive,
        imageMediaId: input.imageMediaId,
      })
      .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
      .returning();
    if (!row) throw new DomainError("NOT_FOUND", "Service not found.");
    await tx.delete(staffServices).where(eq(staffServices.serviceId, serviceId));
    if (input.staffIds.length) {
      await tx.insert(staffServices).values([...new Set(input.staffIds)].map((staffId) => ({ staffId, serviceId })));
    }
    return row;
  });
}

/** Past bookings keep their snapshot (booking_services.service_id is set null). */
export async function deleteService(businessId: string, serviceId: string) {
  const rows = await db
    .delete(services)
    .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
    .returning({ id: services.id });
  if (!rows.length) throw new DomainError("NOT_FOUND", "Service not found.");
}
