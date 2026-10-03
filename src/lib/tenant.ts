import "server-only";
import { cache } from "react";
import { resolveBusiness } from "@/domain/business/resolve-business";
import { getCatalog } from "@/domain/catalog/get-catalog";

/**
 * Request-scoped (deduplicated) wrappers around the domain functions, so a
 * layout + page + metadata can all ask for the tenant without extra queries.
 */
export const getBusinessBySlug = cache((slug: string) => resolveBusiness({ slug }));
export const getBusinessByHost = cache((hostname: string) => resolveBusiness({ hostname }));
export const getCatalogCached = cache((businessId: string) => getCatalog(businessId));
