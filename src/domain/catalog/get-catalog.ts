/**
 * Public catalog for a business: ordered categories, active services and
 * staff (with images), and which staff member performs which service.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { media, serviceCategories, services, staff, staffServices } from "@/db/schema";
import { toMediaView, type MediaRow } from "@/domain/media/image";
import type { Catalog } from "./selection";

export type { Catalog, CatalogCategory, CatalogService, CatalogStaff } from "./selection";

const serviceImage = alias(media, "service_image");
const staffPhoto = alias(media, "staff_photo");

const view = (row: MediaRow | null) => (row?.id ? toMediaView(row) : null);

export async function getCatalog(businessId: string): Promise<Catalog> {
  const [categoryRows, serviceRows, staffRows] = await Promise.all([
    db
      .select({ id: serviceCategories.id, name: serviceCategories.name })
      .from(serviceCategories)
      .where(eq(serviceCategories.businessId, businessId))
      .orderBy(asc(serviceCategories.position), asc(serviceCategories.name)),
    db
      .select({ service: services, image: serviceImage })
      .from(services)
      .leftJoin(serviceImage, eq(serviceImage.id, services.imageMediaId))
      .where(and(eq(services.businessId, businessId), eq(services.isActive, true)))
      .orderBy(asc(services.sortOrder), asc(services.name)),
    db
      .select({ staff, photo: staffPhoto })
      .from(staff)
      .leftJoin(staffPhoto, eq(staffPhoto.id, staff.photoMediaId))
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
            staffRows.map((s) => s.staff.id),
          ),
        )
    : [];

  return {
    categories: categoryRows,
    services: serviceRows.map(({ service: s, image }) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      categoryId: s.categoryId,
      durationMin: s.durationMin,
      priceCents: s.priceCents,
      image: view(image),
    })),
    staff: staffRows.map(({ staff: s, photo }) => ({
      id: s.id,
      displayName: s.displayName,
      title: s.title,
      bio: s.bio,
      photo: view(photo),
      serviceIds: links.filter((l) => l.staffId === s.id).map((l) => l.serviceId),
    })),
  };
}
