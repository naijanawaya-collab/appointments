/** Shared in-memory Storefront fixture for unit tests (no database). */
import { defaultConfig } from "@/domain/storefront/config";
import type { Storefront } from "@/domain/storefront/service";

export const img = (id: string) => ({ id, src: `https://images.unsplash.com/${id}`, width: 900, height: 900, alt: id, position: "50% 50%" });

export function makeStorefront(over: Partial<Storefront> = {}): Storefront {
  return {
    business: {
      id: "b1",
      name: "Kaiser & Co. Gentlemen's Barbers",
      shortName: "Kaiser & Co.",
      mark: "K",
      slug: "kaiser",
      category: "barber",
      timezone: "Europe/Vienna",
      currency: "EUR",
      locale: "de-AT",
      email: "hallo@kaiser.test",
      phone: "+43 1 402 18 77",
      address: "Josefstädter Straße 21, 1080 Wien",
      lat: 48.21,
      lon: 16.348,
      instagram: "kaiser.barbers",
      tiktok: null,
      whatsapp: null,
      description: null,
      eyebrow: "Josefstadt · since 1987",
      tagline: "Traditional cuts.",
      about: "Three generations.",
      aboutTitle: "Three generations, one street",
      ratingValue: 4.9,
      ratingCount: 212,
      legalNotice: null,
      maxAdvanceDays: 60,
      cancellationWindowHours: 24,
    },
    config: { ...defaultConfig("classic"), hero: { layout: "split", mediaIds: ["h1"] }, gallery: ["g1", "g2", "g3"] },
    media: { h1: img("h1"), g1: img("g1"), g2: img("g2"), g3: img("g3") },
    catalog: {
      categories: [{ id: "c1", name: "Haircuts" }],
      services: [{ id: "s1", name: "Classic cut", description: "Wash, cut", categoryId: "c1", durationMin: 40, priceCents: 3200, image: null }],
      staff: [{ id: "p1", displayName: "Anton", title: "Owner", bio: null, photo: null, serviceIds: ["s1"] }],
    },
    openingHours: [{ weekday: 4, startTime: "09:00:00", endTime: "19:00:00" }],
    closures: [],
    reviews: [{ id: "r1", quote: "Best shave", author: "Daniel R.", source: "Google" }],
    primaryDomain: null,
    publishedAt: null,
    ...over,
  };
}

