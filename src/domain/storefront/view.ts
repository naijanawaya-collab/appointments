/**
 * Storefront view model: everything the page renders, derived from stored
 * data. Pure, so the acceptance criteria (section order, hidden empty
 * sections, labels, fallbacks) are unit-tested without a browser.
 */
import { localDateString } from "@/domain/availability/compute-slots";
import { groupByCategory } from "@/domain/catalog/selection";
import { formatRanges, holidayNotice, isClosureDay, openStatus, openStatusText, weeklyHours } from "@/domain/hours/hours";
import type { MediaView } from "@/domain/media/image";
import { isoWeekday } from "@/domain/availability/compute-slots";
import { formatDuration, formatMoney } from "@/lib/format";
import { directionsHref, instagramUrl, mailHref, osmEmbed, siteHref, telHref, tiktokUrl, waHref } from "@/lib/links";
import { effectiveHeroLayout, type SectionKey } from "./config";
import type { Storefront } from "./service";

export const SERVICES_SHOWN = 12;

const NAV_LABELS: Partial<Record<SectionKey, string>> = { services: "Services", team: "Team", gallery: "Gallery", visit: "Visit" };

export function teamTitle(category: string, count: number): string {
  if (category === "beauty") return "The hands";
  return count > 3 ? "Your barbers" : "The crew";
}

export type StorefrontView = ReturnType<typeof buildStorefrontView>;

export function buildStorefrontView(sf: Storefront, opts: { now: Date; basePath: string }) {
  const { business: b, config, catalog } = sf;
  const tz = b.timezone;
  const media = (id: string | null | undefined): MediaView | null => (id ? (sf.media[id] ?? null) : null);
  const book = siteHref(opts.basePath, "/book");
  const today = localDateString(opts.now, tz);
  const short = b.shortName || b.name;
  const phone = b.phone ?? "";
  const whatsapp = b.whatsapp || phone;

  const links = {
    home: siteHref(opts.basePath, "/"),
    book,
    tel: phone ? telHref(phone) : null,
    whatsapp: whatsapp ? waHref(whatsapp) : null,
    directions: b.address ? directionsHref(b.address) : null,
    mail: b.email ? mailHref(b.email) : null,
    instagram: instagramUrl(b.instagram),
    tiktok: tiktokUrl(b.tiktok),
    legal: siteHref(opts.basePath, "/legal"),
  };

  const announcement =
    config.announcement && (!config.announcement.until || config.announcement.until >= today) ? config.announcement : null;

  const heroSlides = config.hero.mediaIds.map(media).filter((m): m is MediaView => Boolean(m));
  const status = openStatus(opts.now, tz, sf.openingHours, sf.closures);

  const visible = new Set(config.sections.filter((s) => s.visible).map((s) => s.key));

  // Section payloads; `null` = nothing to show (hidden from DOM and nav, S-13/S-14)
  const groups = groupByCategory(catalog);
  let shown = 0;
  const serviceGroups = groups
    .map((g) => ({
      id: g.category.id,
      name: g.category.name,
      items: g.services
        .filter(() => shown++ < SERVICES_SHOWN)
        .map((s) => ({
          id: s.id,
          name: s.name,
          meta: [formatDuration(s.durationMin), s.description].filter(Boolean).join(" · "),
          price: formatMoney(s.priceCents, b.currency, b.locale),
          image: config.serviceImages ? s.image : null,
          href: `${book}?service=${s.id}`,
        })),
    }))
    .filter((g) => g.items.length > 0);

  const gallery = config.gallery.map(media).filter((m): m is MediaView => Boolean(m));
  const week = weeklyHours(sf.openingHours);
  const todayIndex = isoWeekday(today) - 1;

  const sectionData = {
    about: b.about
      ? { key: "about" as const, title: b.aboutTitle || `About ${short}`, text: b.about, image: media(config.aboutMediaId) }
      : null,
    services: catalog.services.length
      ? { key: "services" as const, groups: serviceGroups, total: catalog.services.length, more: catalog.services.length > SERVICES_SHOWN }
      : null,
    team: catalog.staff.length
      ? {
          key: "team" as const,
          title: teamTitle(b.category, catalog.staff.length),
          people: catalog.staff.map((p, i) => ({
            id: p.id,
            name: p.displayName,
            title: p.title,
            bio: p.bio,
            photo: p.photo,
            initial: p.displayName.slice(0, 1).toUpperCase(),
            href: `${book}?staff=${p.id}`,
            delay: (i % 4) * 70,
          })),
        }
      : null,
    gallery: { key: "gallery" as const, images: gallery, instagram: links.instagram },
    reviews: sf.reviews.length
      ? {
          key: "reviews" as const,
          rating: b.ratingValue && b.ratingCount ? { value: b.ratingValue.toFixed(1), count: b.ratingCount } : null,
          items: sf.reviews,
        }
      : null,
    visit: {
      key: "visit" as const,
      status: { open: status.open, ...openStatusText(status), closesAt: status.open ? status.closesAt : null },
      holiday: holidayNotice(opts.now, tz, sf.closures),
      hours: week.map((d, i) => ({
        label: i === todayIndex ? `${d.label} · today` : d.label,
        text: formatRanges(d.ranges),
        today: i === todayIndex && !isClosureDay(today, sf.closures),
        closed: d.ranges.length === 0,
      })),
      map: b.lat != null && b.lon != null ? { src: osmEmbed(b.lat, b.lon), title: `Map showing ${b.address ?? short}` } : null,
      address: b.address,
      phone,
    },
  };

  const sections = config.sections
    .filter((s) => s.visible && s.key !== "contact")
    .map((s) => sectionData[s.key as Exclude<SectionKey, "contact">])
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const nav = sections
    .filter((s) => NAV_LABELS[s.key])
    .map((s) => ({ id: `sec-${s.key}`, label: NAV_LABELS[s.key]! }));

  return {
    businessId: b.id,
    name: b.name,
    short,
    mark: b.mark,
    logo: media(config.logoMediaId),
    eyebrow: b.eyebrow,
    tagline: b.tagline,
    address: b.address,
    phone,
    email: b.email,
    links,
    announcement,
    hero: { layout: effectiveHeroLayout(config.hero.layout, heroSlides.length), slides: heroSlides },
    status: sectionData.visit.status,
    nav,
    sections,
    showSocials: visible.has("contact"),
    hasServices: Boolean(sectionData.services),
  };
}
