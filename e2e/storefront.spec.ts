import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalScroll } from "./a11y";

/** Storefront acceptance criteria (docs/designs/SCREENS.md §1, TEST-PLAN storefront.spec). */

const isMobile = (w: number | undefined) => (w ?? 1280) < 900;

test.describe("storefront", () => {
  test("renders server-side theme on first paint (T-1, T-2)", async ({ page }) => {
    await page.goto("/kaiser");
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
    expect(accent).toBe("#8a6a2f");
    await expect(page.getByRole("heading", { level: 1, name: /Kaiser & Co\. Gentlemen.s Barbers/ })).toBeVisible();
    await expect(page).toHaveTitle("Kaiser & Co. – Book online");
  });

  test("FADE/LAB defaults to dark mode with its own font and accent", async ({ page }) => {
    await page.goto("/fadelab");
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return { bg: s.getPropertyValue("--background").trim(), accent: s.getPropertyValue("--accent").trim() };
    });
    expect(vars).toEqual({ bg: "#16171a", accent: "#ff5a1f" });
  });

  test("announcement dismissal persists across reloads (S-1, S-2)", async ({ page }) => {
    await page.goto("/kaiser");
    const bar = page.getByRole("region", { name: "Announcement" });
    await expect(bar).toContainText("Beard packages");
    await page.getByRole("button", { name: "Dismiss announcement" }).click();
    await expect(bar).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Announcement" })).toHaveCount(0);
  });

  test("header shrinks after scrolling (S-3)", async ({ page }) => {
    await page.goto("/kaiser");
    const header = page.locator(".sf-header");
    await expect(header).toHaveAttribute("data-scrolled", "false");
    await page.mouse.wheel(0, 400);
    await expect(header).toHaveAttribute("data-scrolled", "true");
  });

  test("mobile menu opens, closes with Escape, reflects aria-expanded (S-5)", async ({ page, viewport }) => {
    test.skip(!isMobile(viewport?.width), "hamburger only below 900 px");
    await page.goto("/kaiser");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#sf-menu").getByRole("button", { name: /Services/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#sf-menu")).toHaveCount(0);
  });

  test("desktop nav shows only enabled sections (S-13, S-24)", async ({ page, viewport }) => {
    test.skip(isMobile(viewport?.width), "desktop nav");
    await page.goto("/kaiser");
    const nav = page.getByRole("navigation", { name: "Sections" });
    await expect(nav.getByRole("button")).toHaveText(["Services", "Team", "Gallery", "Visit"]);
  });

  test("service rows and team cards deep-link into booking (S-7, S-15)", async ({ page }) => {
    await page.goto("/kaiser");
    const firstService = page.locator("#sec-services a.sf-service").first();
    await expect(firstService).toHaveAttribute("href", /^\/kaiser\/book\?service=[0-9a-f-]{36}$/);
    const firstPerson = page.locator("#sec-team a.sf-person").first();
    await expect(firstPerson).toHaveAttribute("href", /^\/kaiser\/book\?staff=[0-9a-f-]{36}$/);
    await expect(page.getByRole("link", { name: "Book now" }).first()).toHaveAttribute("href", "/kaiser/book");
  });

  test("a new shop hides empty sections and shows the 'coming soon' gallery (S-14, S-19)", async ({ page }) => {
    await page.goto("/fadelab");
    await expect(page.locator("#sec-about")).toHaveCount(0);
    await expect(page.locator("#sec-reviews")).toHaveCount(0);
    await expect(page.getByText("More work coming soon")).toBeVisible();
  });

  test("gallery opens a lightbox with keyboard navigation and restores focus (S-18, M-9)", async ({ page }) => {
    await page.goto("/kaiser");
    const tile = page.getByRole("button", { name: "Open photo 1 of 9" });
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 / 9");
    await page.keyboard.press("ArrowRight");
    await expect(dialog).toContainText("2 / 9");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(tile).toBeFocused();
  });

  test("visit section: hours, map, directions, phone and WhatsApp links (S-20, S-21)", async ({ page }) => {
    await page.goto("/kaiser");
    const visit = page.locator("#sec-visit");
    await expect(visit.getByText(/· today/)).toBeVisible();
    await expect(visit.locator("iframe")).toHaveAttribute("title", /Map showing Josefstädter Straße 21/);
    await expect(visit.locator("iframe")).toHaveAttribute("loading", "lazy");
    await expect(visit.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps\/dir/);
    await expect(visit.getByRole("link", { name: /\+43 1 402 18 77/ })).toHaveAttribute("href", "tel:+4314021877");
    await expect(visit.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/4314021877");
    await expect(page.locator(".sf-status").first()).toContainText(/Open now|Closed/);
  });

  test("hero image is the eager, high-priority LCP image (S-8)", async ({ page }) => {
    await page.goto("/kaiser");
    const hero = page.locator("#top img").first();
    await expect(hero).toHaveAttribute("fetchpriority", "high");
    await expect(hero).not.toHaveAttribute("loading", "lazy");
  });

  test("structured data and legal page are present", async ({ page }) => {
    await page.goto("/kaiser");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(ld["@type"]).toBe("HairSalon");
    await page.getByRole("link", { name: "Impressum" }).click();
    await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
  });

  test("unknown shops 404", async ({ page }) => {
    expect((await page.goto("/no-such-shop"))?.status()).toBe(404);
  });

  for (const shop of ["kaiser", "fadelab", "lune"]) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${shop} (${scheme}): no a11y violations, no horizontal scroll at 320 px`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await page.goto(`/${shop}`);
        await expectNoA11yViolations(page, `${shop} ${scheme}`);
        await page.setViewportSize({ width: 320, height: 740 });
        await expectNoHorizontalScroll(page);
      });
    }
  }
});
