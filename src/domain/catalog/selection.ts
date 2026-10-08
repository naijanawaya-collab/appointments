/**
 * Pure catalog types and selection logic – no database access, so it's safe
 * to import from client components as well as the server.
 */
import type { MediaView } from "@/domain/media/image";

export type CatalogCategory = { id: string | null; name: string };

export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  durationMin: number;
  priceCents: number;
  image: MediaView | null;
};

export type CatalogStaff = {
  id: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  photo: MediaView | null;
  serviceIds: string[];
};

export type Catalog = { categories: CatalogCategory[]; services: CatalogService[]; staff: CatalogStaff[] };

export const UNCATEGORISED = "Services";

/** Services grouped by category, in category order; uncategorised services come last. */
export function groupByCategory(catalog: Catalog): { category: CatalogCategory; services: CatalogService[] }[] {
  const groups = catalog.categories.map((category) => ({
    category,
    services: catalog.services.filter((s) => s.categoryId === category.id),
  }));
  const known = new Set(catalog.categories.map((c) => c.id));
  const rest = catalog.services.filter((s) => s.categoryId === null || !known.has(s.categoryId));
  if (rest.length) groups.push({ category: { id: null, name: UNCATEGORISED }, services: rest });
  return groups.filter((g) => g.services.length > 0);
}

/** Staff who can perform ALL of the selected services (for "pick a professional"). */
export function staffForServices(catalog: Catalog, serviceIds: string[]): CatalogStaff[] {
  return catalog.staff.filter((s) => serviceIds.every((id) => s.serviceIds.includes(id)));
}

/** Total duration and price of a selection (shown to the customer; buffers excluded). */
export function summarizeSelection(catalog: Catalog, serviceIds: string[]) {
  const selected = serviceIds
    .map((id) => catalog.services.find((s) => s.id === id))
    .filter((s): s is CatalogService => Boolean(s));
  return {
    services: selected,
    durationMin: selected.reduce((sum, s) => sum + s.durationMin, 0),
    priceCents: selected.reduce((sum, s) => sum + s.priceCents, 0),
  };
}
