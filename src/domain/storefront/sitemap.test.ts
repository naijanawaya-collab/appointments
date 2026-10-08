import { describe, expect, it } from "vitest";
import { platformSitemap, robotsFor, shopEntries } from "./sitemap";

const d = new Date("2026-10-01T00:00:00Z");

describe("robotsFor", () => {
  it("keeps the admin, auth pages, API and secret booking links out of search engines", () => {
    const r = robotsFor("https://example.com", true);
    expect(r.rules.disallow).toEqual(expect.arrayContaining(["/admin", "/api/", "/login", "/*/b/"]));
    expect(r.sitemap).toBe("https://example.com/sitemap.xml");
    expect(robotsFor("https://mbacutz.com", false).rules.disallow).toEqual(["/api/", "/b/"]);
  });
});

describe("sitemaps", () => {
  it("lists a shop's storefront, booking and legal pages", () => {
    expect(shopEntries("https://mbacutz.com", d).map((e) => e.url)).toEqual(["https://mbacutz.com", "https://mbacutz.com/book", "https://mbacutz.com/legal"]);
  });

  it("lists platform pages and only shops without their own domain", () => {
    const urls = platformSitemap("https://example.com", [
      { slug: "kaiser", domain: null, updatedAt: d },
      { slug: "mbacutz", domain: "mbacutz.com", updatedAt: d },
    ]).map((e) => e.url);
    expect(urls).toContain("https://example.com");
    expect(urls).toContain("https://example.com/kaiser/book");
    expect(urls.some((u) => u.includes("mbacutz"))).toBe(false);
  });
});
