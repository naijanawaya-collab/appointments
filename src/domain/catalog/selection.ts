/**
 * Pure catalog types and selection logic – no database access, so it's safe
 * to import from client components as well as the server.
 */

export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMin: number;
  priceCents: number;
};

export type CatalogStaff = {
  id: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  photoUrl: string | null;
  serviceIds: string[];
};

export type Catalog = { services: CatalogService[]; staff: CatalogStaff[] };

/** Staff who can perform ALL of the selected services (for "pick a professional"). */
export function staffForServices(catalog: Catalog, serviceIds: string[]): CatalogStaff[] {
  return catalog.staff.filter((s) => serviceIds.every((id) => s.serviceIds.includes(id)));
}

/** Total duration and price of a selection (shown to the customer; buffers excluded). */
export function summarizeSelection(catalog: Catalog, serviceIds: string[]) {
  const selected = catalog.services.filter((s) => serviceIds.includes(s.id));
  return {
    services: selected,
    durationMin: selected.reduce((sum, s) => sum + s.durationMin, 0),
    priceCents: selected.reduce((sum, s) => sum + s.priceCents, 0),
  };
}
