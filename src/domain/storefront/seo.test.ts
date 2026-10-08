import { describe, expect, it } from "vitest";
import { makeStorefront } from "../../../tests/support/storefront";
import { canonicalUrl, storefrontJsonLd, storefrontMetadata, storefrontTitle } from "./seo";

describe("storefront SEO", () => {
  it("titles '<Shop> – Book online' unless the owner set a title", () => {
    const sf = makeStorefront();
    expect(storefrontTitle(sf)).toBe("Kaiser & Co. – Book online");
    sf.config.seo = { title: "Kaiser – Barber in Josefstadt", description: "" };
    expect(storefrontTitle(sf)).toBe("Kaiser – Barber in Josefstadt");
  });

  it("uses the tagline as description and the custom domain as canonical when verified", () => {
    const sf = makeStorefront({ primaryDomain: "kaiser-barbers.at" });
    const meta = storefrontMetadata(sf, { preview: false, isCustomDomain: true });
    expect(meta.description).toBe("Traditional cuts.");
    expect(meta.alternates?.canonical).toBe("https://kaiser-barbers.at");
    expect(meta.robots).toBeUndefined();
    expect(canonicalUrl(makeStorefront())).toMatch(/\/kaiser$/);
  });

  it("never indexes draft previews", () => {
    expect(storefrontMetadata(makeStorefront(), { preview: true, isCustomDomain: false }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("emits HairSalon JSON-LD with address, geo, hours, price range and rating", () => {
    const ld = storefrontJsonLd(makeStorefront());
    expect(ld["@type"]).toBe("HairSalon");
    expect(ld.address).toEqual({ "@type": "PostalAddress", streetAddress: "Josefstädter Straße 21, 1080 Wien" });
    expect(ld.geo).toEqual({ "@type": "GeoCoordinates", latitude: 48.21, longitude: 16.348 });
    expect(ld.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "09:00", closes: "19:00" },
    ]);
    expect(ld.priceRange).toContain("32,00");
    expect(ld.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.9, reviewCount: 212 });
  });

  it("uses BeautySalon for beauty shops", () => {
    const sf = makeStorefront();
    sf.business.category = "beauty";
    expect(storefrontJsonLd(sf)["@type"]).toBe("BeautySalon");
  });
});
