import { expect, test } from "@playwright/test";
import { bookFirstAvailable } from "./helpers";

/**
 * `kaiser.localhost` is seeded as the demo shop's custom domain.
 * Chromium resolves *.localhost to 127.0.0.1, so this exercises the real
 * hostname → tenant path through src/proxy.ts.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const CUSTOM = `http://kaiser.localhost:${PORT}`;

test.describe("custom domain", () => {
  test("serves the shop's storefront at the root of its own domain", async ({ page }) => {
    await page.goto(CUSTOM);
    await expect(page).toHaveURL(`${CUSTOM}/`);
    await expect(page.getByRole("heading", { level: 1, name: /Kaiser & Co\. Gentlemen.s Barbers/ })).toBeVisible();
    await expect(page).toHaveTitle(/Kaiser & Co\./);
  });

  test("books on the custom domain and keeps the manage link on it", async ({ page }) => {
    await page.goto(`${CUSTOM}/book`);
    const manageUrl = await bookFirstAvailable(page, { name: "Domain Customer", email: "domain@example.com" });
    expect(new URL(manageUrl).host).toBe(`kaiser.localhost:${PORT}`);

    await page.goto(manageUrl);
    await expect(page.getByRole("heading", { name: "Your booking" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("button", { name: "Yes, cancel" }).click();
    await expect(page.getByRole("status")).toContainText("This booking has been cancelled");
    await page.reload();
    await page.getByRole("link", { name: "Book a new time" }).click();
    await expect(page).toHaveURL(new RegExp(`^${CUSTOM}/book(\\?step=services)?$`));
    await expect(page.getByRole("heading", { name: "Choose services" })).toBeVisible();
  });

  test("a custom domain can't open another shop's manage links", async ({ page }) => {
    await page.goto("/kaiser/book");
    const manageUrl = await bookFirstAvailable(page, { name: "Other", email: "other@example.com" });
    const token = manageUrl.split("/b/")[1];
    // Same token, but requested through a domain that isn't this booking's shop.
    expect((await page.goto(`http://unknown-shop.localhost:${PORT}/b/${token}`))?.status()).toBe(404);
  });

  test("unknown domains 404 and admin isn't exposed on tenant domains", async ({ page }) => {
    expect((await page.goto(`http://unknown-shop.localhost:${PORT}/`))?.status()).toBe(404);
    expect((await page.goto(`${CUSTOM}/admin`))?.status()).toBe(404);
  });

  test("hostname segments are not reachable on the platform domain", async ({ page }) => {
    expect((await page.goto("/kaiser.localhost"))?.status()).toBe(404);
  });
});
