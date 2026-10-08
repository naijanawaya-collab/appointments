/**
 * Demo shops from the design handover (docs/designs/tokens/seed-shops.json):
 * Kaiser & Co. (classic), FADE/LAB (modern) and Lune (soft), plus an optional
 * "stress" shop from the test plan. Idempotent: existing slugs are skipped.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { defaultConfig, type SectionKey, type StorefrontConfig } from "@/domain/storefront/config";
import type { PresetKey } from "@/domain/theme/presets";

type RawItem = { id: string; name: string; min: number; price: number; desc?: string };
type RawShop = {
  key: string;
  name: string;
  short: string;
  mark: string;
  eyebrow: string;
  tagline: string;
  about: string;
  address: string;
  phone: string;
  email: string;
  announcement: { tag: string; text: string } | null;
  hero: "split" | "full" | "carousel" | "text";
  heroLabel: string;
  sections: string[];
  serviceImages?: boolean;
  categories: { name: string; items: RawItem[] }[];
  staff: { id: string; name: string; title: string; bio: string; photo: boolean }[];
  galleryLabels: string[];
  reviews: { q: string; a: string }[];
  hours: { d: string; h: string; closed?: boolean }[];
  lead: number;
  media: {
    hero: string[];
    heroAlt: string[];
    about: string | null;
    aboutAlt?: string;
    gallery: string[];
    staff: Record<string, string>;
    services?: Record<string, string>;
    geo: { lat: number; lon: number };
  };
};

const SEED_FILE = path.resolve(process.cwd(), "docs/designs/tokens/seed-shops.json");

const EXTRA: Record<string, { preset: PresetKey; category: "barber" | "beauty"; aboutTitle?: string; rating?: [number, number]; instagram?: string; tiktok?: string }> = {
  kaiser: { preset: "classic", category: "barber", aboutTitle: "Three generations, one street", rating: [4.9, 212], instagram: "kaiser.barbers", tiktok: "kaiser.barbers" },
  fadelab: { preset: "modern", category: "barber", instagram: "fadelab.wien", tiktok: "fadelab.wien" },
  lune: { preset: "soft", category: "beauty", aboutTitle: "A quiet studio", rating: [5.0, 64], instagram: "lune.studio" },
};

const DAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** "09:00–13:00 · 14:00–19:00" → [["09:00","13:00"],["14:00","19:00"]] */
export function parseHoursText(text: string): [string, string][] {
  if (/closed/i.test(text)) return [];
  return text.split("·").map((part) => {
    const [a, b] = part.trim().split(/[–-]/).map((t) => t.trim());
    return [a, b] as [string, string];
  });
}

const focalFrom = (label: string): [number, number] => {
  const m = /focal (\d+)% (\d+)%/.exec(label);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
};

/** hours/location in the prototype are one "Visit us" section here. */
function mapSections(raw: string[]): StorefrontConfig["sections"] {
  const order: SectionKey[] = [];
  for (const k of raw) {
    const key = (k === "hours" || k === "location" ? "visit" : k) as SectionKey;
    if (!order.includes(key)) order.push(key);
  }
  const all: SectionKey[] = ["about", "services", "team", "gallery", "reviews", "visit", "contact"];
  return [...order.map((key) => ({ key, visible: true })), ...all.filter((k) => !order.includes(k)).map((key) => ({ key, visible: false }))];
}

export function loadRawShops(): RawShop[] {
  return Object.values(JSON.parse(readFileSync(SEED_FILE, "utf8")) as Record<string, RawShop>);
}

type SeedOptions = { ownerUserId?: string; localDomains?: boolean };

export async function seedShop(db: Db, raw: RawShop, opts: SeedOptions = {}): Promise<string | null> {
  const [existing] = await db.select({ id: s.businesses.id }).from(s.businesses).where(eq(s.businesses.slug, raw.key));
  if (existing) return null;
  const extra = EXTRA[raw.key] ?? { preset: "editorial" as PresetKey, category: "barber" as const };

  return db.transaction(async (tx) => {
    const [business] = await tx
      .insert(s.businesses)
      .values({
        name: raw.name,
        shortName: raw.short,
        mark: raw.mark,
        slug: raw.key,
        category: extra.category,
        email: raw.email,
        phone: raw.phone,
        whatsapp: raw.phone,
        address: raw.address,
        lat: raw.media.geo.lat,
        lon: raw.media.geo.lon,
        instagram: extra.instagram ?? null,
        tiktok: extra.tiktok ?? null,
        eyebrow: raw.eyebrow,
        tagline: raw.tagline,
        description: raw.tagline,
        about: raw.about || null,
        aboutTitle: extra.aboutTitle ?? null,
        ratingValue: extra.rating?.[0] ?? null,
        ratingCount: extra.rating?.[1] ?? null,
        slotIntervalMin: 30,
        minLeadTimeMin: 60,
        cancellationWindowHours: raw.lead,
      })
      .returning();

    const addMedia = async (url: string, alt: string, w: number, h: number, focal: [number, number] = [50, 50]) => {
      const [m] = await tx
        .insert(s.media)
        .values({ businessId: business.id, provider: "external", url, width: w, height: h, alt, focalX: focal[0], focalY: focal[1] })
        .returning({ id: s.media.id });
      return m.id;
    };

    const focal = focalFrom(raw.heroLabel);
    const heroIds: string[] = [];
    for (const [i, url] of raw.media.hero.entries()) {
      heroIds.push(await addMedia(url, raw.media.heroAlt[i] ?? `Inside ${raw.short}`, 1600, 2000, focal));
    }
    const aboutId = raw.media.about ? await addMedia(raw.media.about, raw.media.aboutAlt ?? `Inside ${raw.short}`, 1400, 933) : null;
    const galleryIds: string[] = [];
    for (const [i, url] of raw.media.gallery.entries()) {
      const label = raw.galleryLabels[i]?.split("·").pop()?.trim();
      galleryIds.push(await addMedia(url, label ? `${label[0].toUpperCase()}${label.slice(1)}` : `Work by ${raw.short}`, 900, 900));
    }

    const config: StorefrontConfig = {
      ...defaultConfig(extra.preset),
      hero: { layout: raw.hero, mediaIds: heroIds },
      aboutMediaId: aboutId,
      gallery: galleryIds,
      sections: mapSections(raw.sections),
      announcement: raw.announcement ? { id: "welcome", tag: raw.announcement.tag, text: raw.announcement.text, until: null } : null,
      serviceImages: Boolean(raw.serviceImages),
      seo: { title: `${raw.short} – Book online`, description: raw.tagline },
    };
    await tx.insert(s.storefrontConfigs).values({ businessId: business.id, draft: config, published: config, publishedAt: new Date() });

    // Services
    const serviceIds: string[] = [];
    let order = 0;
    for (const [position, cat] of raw.categories.entries()) {
      const [category] = await tx.insert(s.serviceCategories).values({ businessId: business.id, name: cat.name, position }).returning();
      for (const item of cat.items) {
        const imageUrl = raw.media.services?.[item.id];
        const imageId = imageUrl ? await addMedia(imageUrl, item.name, 300, 300) : null;
        const [svc] = await tx
          .insert(s.services)
          .values({
            businessId: business.id,
            categoryId: category.id,
            name: item.name,
            description: item.desc ?? null,
            durationMin: item.min,
            bufferMin: 0,
            priceCents: item.price,
            imageMediaId: imageId,
            sortOrder: order++,
          })
          .returning({ id: s.services.id });
        serviceIds.push(svc.id);
      }
    }

    // Opening hours (also each professional's default working hours)
    const hours = raw.hours.flatMap((d) =>
      parseHoursText(d.h).map(([startTime, endTime]) => ({ weekday: DAY_INDEX[d.d], startTime, endTime })),
    );
    if (hours.length) await tx.insert(s.openingHours).values(hours.map((h) => ({ ...h, businessId: business.id })));

    for (const [i, p] of raw.staff.entries()) {
      const photoUrl = raw.media.staff[p.id];
      const photoId = photoUrl ? await addMedia(photoUrl, p.name, 600, 750) : null;
      const [member] = await tx
        .insert(s.staff)
        .values({ businessId: business.id, displayName: p.name, title: p.title, bio: p.bio || null, photoMediaId: photoId, sortOrder: i })
        .returning();
      if (serviceIds.length) await tx.insert(s.staffServices).values(serviceIds.map((serviceId) => ({ staffId: member.id, serviceId })));
      if (hours.length) await tx.insert(s.workingHours).values(hours.map((h) => ({ ...h, staffId: member.id })));
    }

    if (raw.reviews.length) {
      await tx.insert(s.reviews).values(raw.reviews.map((r, position) => ({ businessId: business.id, quote: r.q, author: r.a, position })));
    }
    if (raw.key === "kaiser") {
      await tx.insert(s.closures).values([
        { businessId: business.id, startsOn: "2026-12-24", endsOn: "2026-12-26", label: "Christmas" },
        { businessId: business.id, startsOn: "2027-01-01", endsOn: "2027-01-01", label: "New Year" },
      ]);
    }
    if (opts.localDomains) {
      await tx.insert(s.businessDomains).values({ businessId: business.id, hostname: `${raw.key}.localhost`, isPrimary: true, verifiedAt: new Date() });
    }
    if (opts.ownerUserId) {
      await tx.insert(s.members).values({ businessId: business.id, userId: opts.ownerUserId, role: "owner" });
    }
    return business.id;
  });
}

/** Test-plan "stress" shop: long German name, 1 professional, no photos, low-contrast accent. */
export async function seedStressShop(db: Db, opts: SeedOptions = {}) {
  const raw: RawShop = {
    key: "stress",
    name: "Friseursalon Schönheitsoase Margareten am Gürtel",
    short: "Schönheitsoase",
    mark: "S",
    eyebrow: "Margareten · seit 2024",
    tagline: "Haarschnitte, Farbe und Pflege mit viel Zeit für Sie.",
    about: "",
    address: "Margaretengürtel 100, 1050 Wien",
    phone: "+43 1 555 00 00",
    email: "hallo@schoenheitsoase.test",
    announcement: null,
    hero: "split",
    heroLabel: "",
    sections: ["services", "team", "gallery", "hours", "contact"],
    categories: [{ name: "Damen", items: [{ id: "x1", name: "Damenhaarschnitt mit Waschen, Föhnen und Pflegekur", min: 90, price: 6900 }] }],
    staff: [{ id: "s1", name: "Brigitte", title: "Inhaberin", bio: "", photo: false }],
    galleryLabels: [],
    reviews: [],
    hours: [
      { d: "Mon", h: "Closed" },
      ...["Tue", "Wed", "Thu", "Fri"].map((d) => ({ d, h: "09:00–18:00" })),
      { d: "Sat", h: "09:00–13:00" },
      { d: "Sun", h: "Closed" },
    ],
    lead: 24,
    media: { hero: [], heroAlt: [], about: null, gallery: [], staff: {}, geo: { lat: 48.1849, lon: 16.3543 } },
  };
  const id = await seedShop(db, raw, opts);
  if (id) {
    const config = { ...defaultConfig("editorial"), accent: "#f5e663", sections: mapSections(raw.sections) };
    await db.update(s.storefrontConfigs).set({ draft: config, published: config }).where(eq(s.storefrontConfigs.businessId, id));
  }
  return id;
}
