import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalScroll } from "./a11y";

/** Platform landing (SCREENS §5, L-1…L-6) and the platform's legal pages. */

test.describe("landing page", () => {
  test("hero, live demo and real storefront previews (L-1, L-4)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Your shop, your look/);
    await expect(page.getByRole("heading", { level: 1, name: "Your shop, your look. Booked in a minute." })).toBeVisible();

    const phones = page.locator("#examples figure");
    await expect(phones).toHaveCount(3);
    for (const img of await phones.locator("img").all()) {
      expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
    }

    await page.getByRole("link", { name: "See a live demo" }).click();
    await expect(page).toHaveURL(/\/kaiser$/);
    await expect(page.getByRole("heading", { level: 1, name: /Kaiser & Co/ })).toBeVisible();
  });

  test("nav anchors land below the sticky header (L-2) and sign in works", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop nav");
    await page.goto("/");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Features" }).click();
    await expect(page).toHaveURL(/#features$/);
    const top = await page.locator("#features").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(60);
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("phones row scrolls on small screens and every phone is reachable (L-5)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phone layout");
    await page.goto("/");
    await expectNoHorizontalScroll(page);
    const row = page.locator("#examples");
    await row.evaluate((el) => el.scrollTo({ left: 0 }));
    const first = await page.locator("#examples figure").first().boundingBox();
    expect(first!.x).toBeGreaterThanOrEqual(0);
    await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    const last = await page.locator("#examples figure").last().boundingBox();
    expect(last!.x + last!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`no a11y violations, no overflow at 320 px (${scheme}, L-6)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: 320, height: 720 });
      await page.goto("/");
      await expectNoHorizontalScroll(page);
      await expectNoA11yViolations(page, `landing ${scheme}`);
    });
  }

  test("platform Impressum and privacy pages exist", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: "Impressum" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Impressum" })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
    await expectNoA11yViolations(page, "privacy");
  });
});
