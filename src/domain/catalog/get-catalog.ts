/**
 * Public catalog for a business: active services, active staff, and which
 * staff member can perform which service. Everything the booking flow's
 * first two steps (pick services -> pick professional) needs.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { services, staff, staffServices } from "@/db/schema";
import type { Catalog } from "./selection";

export type { Catalog, CatalogService, CatalogStaff } from "./selection";

export async function getCatalog(businessId: string): Promise<Catalog> {
  const [serviceRows, staffRows] = await Promise.all([
    db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        category: services.category,
        durationMin: services.durationMin,
        priceCents: services.priceCents,
      })
      .from(services)
      .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db
      .select({
        id: staff.id,
        displayName: staff.displayName,
        title: staff.title,
        bio: staff.bio,
        photoUrl: staff.photoUrl,
      })
      .from(staff)
      .where(and(eq(staff.businessId, businessId), eq(staff.isActive, true)))
      .orderBy(asc(staff.sortOrder), asc(staff.displayName)),
  ]);

  const links = staffRows.length
    ? await db
        .select()
        .from(staffServices)
        .where(
          inArray(
            staffServices.staffId,
            staffRows.map((s) => s.id),
          ),
        )
    : [];

  return {
    services: serviceRows,
    staff: staffRows.map((s) => ({
      ...s,
      serviceIds: links.filter((l) => l.staffId === s.id).map((l) => l.serviceId),
    })),
  };
}
