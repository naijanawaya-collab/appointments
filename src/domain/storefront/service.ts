/**
 * Loading and saving storefronts. Everything a storefront page needs comes
 * from `getStorefront()` in one round of parallel queries, which the app
 * caches per business (src/lib/tenant.ts) and invalidates on every edit.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  businessDomains,
  businesses,
  closures,
  media,
  openingHours,
  reviews,
  storefrontConfigs,
} from "@/db/schema";
import { getCatalog } from "@/domain/catalog/get-catalog";
import { toMediaView, type MediaView } from "@/domain/media/image";
import { defaultConfig, parseConfig, publishIssues, storefrontConfigSchema, type StorefrontConfig } from "./config";
import { DomainError } from "@/domain/errors";

export type StorefrontBusiness = Pick<
  typeof businesses.$inferSelect,
  | "id"
  | "name"
  | "shortName"
  | "mark"
  | "slug"
  | "category"
  | "timezone"
  | "currency"
  | "locale"
  | "email"
  | "phone"
  | "address"
  | "lat"
  | "lon"
  | "instagram"
  | "tiktok"
  | "whatsapp"
  | "description"
  | "eyebrow"
  | "tagline"
  | "about"
  | "aboutTitle"
  | "ratingValue"
  | "ratingCount"
  | "maxAdvanceDays"
  | "cancellationWindowHours"
>;

export type Storefront = {
  business: StorefrontBusiness;
  config: StorefrontConfig;
  /** Media referenced by the config, by id */
  media: Record<string, MediaView>;
  catalog: Awaited<ReturnType<typeof getCatalog>>;
  openingHours: { weekday: number; startTime: string; endTime: string }[];
  closures: { startsOn: string; endsOn: string; label: string | null }[];
  reviews: { id: string; quote: string; author: string; source: string }[];
  primaryDomain: string | null;
  publishedAt: string | null;
};

const BUSINESS_COLUMNS = {
  id: businesses.id,
  name: businesses.name,
  shortName: businesses.shortName,
  mark: businesses.mark,
  slug: businesses.slug,
  category: businesses.category,
  timezone: businesses.timezone,
  currency: businesses.currency,
  locale: businesses.locale,
  email: businesses.email,
  phone: businesses.phone,
  address: businesses.address,
  lat: businesses.lat,
  lon: businesses.lon,
  instagram: businesses.instagram,
  tiktok: businesses.tiktok,
  whatsapp: businesses.whatsapp,
  description: businesses.description,
  eyebrow: businesses.eyebrow,
  tagline: businesses.tagline,
  about: businesses.about,
  aboutTitle: businesses.aboutTitle,
  ratingValue: businesses.ratingValue,
  ratingCount: businesses.ratingCount,
  maxAdvanceDays: businesses.maxAdvanceDays,
  cancellationWindowHours: businesses.cancellationWindowHours,
};

/** All media ids a config points at. */
export function referencedMediaIds(config: StorefrontConfig): string[] {
  return [
    ...config.hero.mediaIds,
    ...config.gallery,
    ...(config.aboutMediaId ? [config.aboutMediaId] : []),
    ...(config.logoMediaId ? [config.logoMediaId] : []),
  ];
}

export async function getStorefront(businessId: string, opts: { draft?: boolean } = {}): Promise<Storefront | null> {
  const [row] = await db
    .select({ business: BUSINESS_COLUMNS, config: storefrontConfigs })
    .from(businesses)
    .leftJoin(storefrontConfigs, eq(storefrontConfigs.businessId, businesses.id))
    .where(and(eq(businesses.id, businessId), eq(businesses.isActive, true)));
  if (!row) return null;

  const config = parseConfig(opts.draft ? row.config?.draft : row.config?.published);
  const ids = [...new Set(referencedMediaIds(config))];

  const [mediaRows, catalog, hours, closureRows, reviewRows, domains] = await Promise.all([
    ids.length
      ? db.select().from(media).where(and(eq(media.businessId, businessId), inArray(media.id, ids)))
      : Promise.resolve([]),
    getCatalog(businessId),
    db
      .select({ weekday: openingHours.weekday, startTime: openingHours.startTime, endTime: openingHours.endTime })
      .from(openingHours)
      .where(eq(openingHours.businessId, businessId)),
    db
      .select({ startsOn: closures.startsOn, endsOn: closures.endsOn, label: closures.label })
      .from(closures)
      .where(eq(closures.businessId, businessId))
      .orderBy(asc(closures.startsOn)),
    db
      .select({ id: reviews.id, quote: reviews.quote, author: reviews.author, source: reviews.source })
      .from(reviews)
      .where(eq(reviews.businessId, businessId))
      .orderBy(asc(reviews.position), asc(reviews.createdAt)),
    db
      .select({ hostname: businessDomains.hostname, isPrimary: businessDomains.isPrimary, verifiedAt: businessDomains.verifiedAt })
      .from(businessDomains)
      .where(eq(businessDomains.businessId, businessId)),
  ]);

  const mediaById = Object.fromEntries(mediaRows.map((m) => [m.id, toMediaView(m)]));
  // Drop references to deleted media so pages never render broken images.
  const exists = (id: string) => id in mediaById;
  const cleaned: StorefrontConfig = {
    ...config,
    hero: { ...config.hero, mediaIds: config.hero.mediaIds.filter(exists) },
    gallery: config.gallery.filter(exists),
    aboutMediaId: config.aboutMediaId && exists(config.aboutMediaId) ? config.aboutMediaId : null,
    logoMediaId: config.logoMediaId && exists(config.logoMediaId) ? config.logoMediaId : null,
  };

  const primary = domains.find((d) => d.isPrimary && d.verifiedAt) ?? domains.find((d) => d.verifiedAt);

  return {
    business: row.business,
    config: cleaned,
    media: mediaById,
    catalog,
    openingHours: hours,
    closures: closureRows,
    reviews: reviewRows,
    primaryDomain: primary?.hostname ?? null,
    publishedAt: row.config?.publishedAt?.toISOString() ?? null,
  };
}

/** Ensures a business has a config row (new shops). */
export async function ensureStorefrontConfig(businessId: string, preset: StorefrontConfig["preset"] = "classic") {
  const config = defaultConfig(preset);
  await db
    .insert(storefrontConfigs)
    .values({ businessId, draft: config, published: config })
    .onConflictDoNothing();
}

export async function getDraftConfig(businessId: string): Promise<{ draft: StorefrontConfig; published: StorefrontConfig; publishedAt: Date | null; updatedAt: Date }> {
  const [row] = await db.select().from(storefrontConfigs).where(eq(storefrontConfigs.businessId, businessId));
  if (!row) {
    await ensureStorefrontConfig(businessId);
    return getDraftConfig(businessId);
  }
  return { draft: parseConfig(row.draft), published: parseConfig(row.published), publishedAt: row.publishedAt, updatedAt: row.updatedAt };
}

/** Media ids in a config must belong to this business (tenant isolation). */
async function assertOwnMedia(businessId: string, config: StorefrontConfig) {
  const ids = [...new Set(referencedMediaIds(config))];
  if (!ids.length) return;
  const rows = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.businessId, businessId), inArray(media.id, ids)));
  if (rows.length !== ids.length) throw new DomainError("INVALID_SELECTION", "Some photos don't belong to this shop.");
}

export async function saveDraft(businessId: string, userId: string, input: unknown): Promise<StorefrontConfig> {
  const parsed = storefrontConfigSchema.safeParse(input);
  if (!parsed.success) throw new DomainError("INVALID_SELECTION", parsed.error.issues[0]?.message ?? "Invalid settings.");
  await assertOwnMedia(businessId, parsed.data);
  await ensureStorefrontConfig(businessId);
  await db
    .update(storefrontConfigs)
    .set({ draft: parsed.data, updatedBy: userId })
    .where(eq(storefrontConfigs.businessId, businessId));
  return parsed.data;
}

export async function publishDraft(businessId: string, userId: string): Promise<{ ok: true } | { ok: false; issues: string[] }> {
  const { draft } = await getDraftConfig(businessId);
  const ids = referencedMediaIds(draft);
  const rows = ids.length
    ? await db.select({ id: media.id, alt: media.alt }).from(media).where(and(eq(media.businessId, businessId), inArray(media.id, ids)))
    : [];
  const issues = publishIssues(draft, new Map(rows.map((r) => [r.id, r.alt])));
  if (issues.length) return { ok: false, issues };
  await db
    .update(storefrontConfigs)
    .set({ published: draft, publishedAt: new Date(), updatedBy: userId })
    .where(eq(storefrontConfigs.businessId, businessId));
  return { ok: true };
}

export async function discardDraft(businessId: string, userId: string) {
  const { published } = await getDraftConfig(businessId);
  await db.update(storefrontConfigs).set({ draft: published, updatedBy: userId }).where(eq(storefrontConfigs.businessId, businessId));
  return published;
}
