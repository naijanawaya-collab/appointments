import { describe, expect, it } from "vitest";
import { img, makeStorefront as storefront } from "../../../tests/support/storefront";
import { buildStorefrontView, SERVICES_SHOWN, teamTitle } from "./view";

const NOW = new Date("2026-10-08T09:20:00Z"); // Thu 11:20 Vienna

describe("storefront view", () => {
  it("renders sections in the owner's order and hides disabled ones (S-13)", () => {
    const sf = storefront();
    sf.config.sections = [
      { key: "gallery", visible: true },
      { key: "services", visible: true },
      { key: "team", visible: false },
      { key: "about", visible: true },
      { key: "reviews", visible: true },
      { key: "visit", visible: true },
      { key: "contact", visible: true },
    ];
    const v = buildStorefrontView(sf, { now: NOW, basePath: "/kaiser" });
    expect(v.sections.map((s) => s.key)).toEqual(["gallery", "services", "about", "reviews", "visit"]);
    expect(v.nav.map((n) => n.label)).toEqual(["Gallery", "Services", "Visit"]);
  });

  it("hides About without text and Reviews without reviews (S-14)", () => {
    const sf = storefront({ reviews: [] });
    sf.business.about = null;
    const keys = buildStorefrontView(sf, { now: NOW, basePath: "" }).sections.map((s) => s.key);
    expect(keys).not.toContain("about");
    expect(keys).not.toContain("reviews");
  });

  it("links services and team to booking with preselection (S-15)", () => {
    const v = buildStorefrontView(storefront(), { now: NOW, basePath: "/kaiser" });
    const services = v.sections.find((s) => s.key === "services")!;
    const team = v.sections.find((s) => s.key === "team")!;
    expect("groups" in services && services.groups[0].items[0].href).toBe("/kaiser/book?service=s1");
    expect("people" in team && team.people[0].href).toBe("/kaiser/book?staff=p1");
  });

  it("uses root-relative links on a custom domain", () => {
    const v = buildStorefrontView(storefront(), { now: NOW, basePath: "" });
    expect(v.links.book).toBe("/book");
    expect(v.links.home).toBe("/");
  });

  it("formats prices and durations per design (T-9)", () => {
    const v = buildStorefrontView(storefront(), { now: NOW, basePath: "" });
    const services = v.sections.find((s) => s.key === "services")!;
    expect("groups" in services && services.groups[0].items[0]).toMatchObject({ price: "€\u00a032,00", meta: "40 min · Wash, cut" });
  });

  it("shows service thumbnails only when enabled (S-16)", () => {
    const sf = storefront();
    sf.catalog.services[0].image = img("t1");
    const off = buildStorefrontView(sf, { now: NOW, basePath: "" }).sections.find((s) => s.key === "services")!;
    expect("groups" in off && off.groups[0].items[0].image).toBeNull();
    sf.config.serviceImages = true;
    const on = buildStorefrontView(sf, { now: NOW, basePath: "" }).sections.find((s) => s.key === "services")!;
    expect("groups" in on && on.groups[0].items[0].image?.id).toBe("t1");
  });

  it("caps the services list and flags the rest", () => {
    const sf = storefront();
    sf.catalog.services = Array.from({ length: SERVICES_SHOWN + 3 }, (_, i) => ({ ...sf.catalog.services[0], id: `s${i}` }));
    const s = buildStorefrontView(sf, { now: NOW, basePath: "" }).sections.find((x) => x.key === "services")!;
    expect("groups" in s && s.groups[0].items).toHaveLength(SERVICES_SHOWN);
    expect("more" in s && s.more).toBe(true);
  });

  it("computes open status and highlights today in shop time (S-12, S-20)", () => {
    const v = buildStorefrontView(storefront(), { now: NOW, basePath: "" });
    expect(v.status).toMatchObject({ open: true, strong: "Open now", rest: "until 19:00" });
    const visit = v.sections.find((s) => s.key === "visit")!;
    expect("hours" in visit && visit.hours[3]).toEqual({ label: "Thu · today", text: "09:00–19:00", today: true, closed: false });
    expect("hours" in visit && visit.hours[0]).toMatchObject({ text: "Closed", closed: true });
  });

  it("falls back to the text hero without photos and split for a short carousel", () => {
    expect(buildStorefrontView(storefront({ media: {} }), { now: NOW, basePath: "" }).hero.layout).toBe("text");
    const sf = storefront();
    sf.config.hero = { layout: "carousel", mediaIds: ["h1"] };
    expect(buildStorefrontView(sf, { now: NOW, basePath: "" }).hero.layout).toBe("split");
  });

  it("hides expired announcements", () => {
    const sf = storefront();
    sf.config.announcement = { id: "a", tag: "New", text: "Hi", until: "2026-10-01" };
    expect(buildStorefrontView(sf, { now: NOW, basePath: "" }).announcement).toBeNull();
  });

  it("builds safe contact links", () => {
    const v = buildStorefrontView(storefront(), { now: NOW, basePath: "" });
    expect(v.links).toMatchObject({
      tel: "tel:+4314021877",
      whatsapp: "https://wa.me/4314021877",
      instagram: "https://instagram.com/kaiser.barbers",
      tiktok: null,
    });
  });

  it("titles the team per business type", () => {
    expect(teamTitle("barber", 6)).toBe("Your barbers");
    expect(teamTitle("barber", 2)).toBe("The crew");
    expect(teamTitle("beauty", 3)).toBe("The hands");
  });
});
