import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, expectNoHorizontalScroll } from "./a11y";
import { mockCloudinary, TEST_PHOTO } from "./cloudinary-mock";
import { E2E_ADMIN } from "./global-setup";

/**
 * Storefront editor (MVP-PLAN M5, SCREENS §6). Each test creates its own shop
 * through the operator console, so the demo shops other specs rely on stay
 * untouched.
 */

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/[a-z0-9-]+$/);
}

async function createShop(page: Page, prefix: string) {
  const slug = `${prefix}-${Date.now().toString(36)}`;
  await page.goto("/admin/shops");
  await page.getByLabel("Shop name").fill(`Editor ${slug}`);
  await page.getByLabel("Address on the platform").fill(slug);
  await page.getByLabel("Owner’s name").fill("Editor Owner");
  await page.getByLabel("Owner’s email").fill(`owner@${slug}.test`);
  await page.getByRole("button", { name: "Create shop" }).click();
  await expect(page.getByText("is ready and the owner was emailed an invite")).toBeVisible();
  return slug;
}

const step = (page: Page, name: string) => page.getByRole("navigation", { name: "Editor steps" }).getByRole("button", { name: new RegExp(`^(\\d|✓)?\\s*${name}`) });
const cssVar = (page: Page, name: string) => page.locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name);

test.describe("storefront editor", () => {
  test("owner customises with a live preview; visitors only see it after publishing", async ({ page, browser, isMobile }) => {
    test.skip(isMobile, "Full journey runs on desktop; mobile has its own smoke test.");
    test.setTimeout(120_000);
    await mockCloudinary(page.context());
    await signIn(page);
    const slug = await createShop(page, "ed");

    // A visitor sees the default (Classic) storefront.
    const visitorCtx = await browser.newContext();
    const visitor = await visitorCtx.newPage();
    await visitor.goto(`/${slug}`);
    await expect(visitor.locator("#sec-visit")).toBeVisible();
    const originalAccent = await cssVar(visitor, "--accent");
    expect(originalAccent).toBe("#8a6a2f");

    // Owner opens the editor; the preview shows the draft.
    await page.goto(`/admin/${slug}/storefront`);
    await expect(page.getByRole("heading", { level: 2, name: /Preset/ })).toBeVisible();
    const preview = page.frameLocator("iframe.ed-preview-iframe");
    await expect(preview.locator("#sec-visit")).toBeVisible({ timeout: 20_000 });

    // Colours: the preview updates without a reload (ED-1).
    await step(page, "Colours").click();
    const hex = page.getByLabel("Accent colour", { exact: true });
    await hex.fill("#1F5F5B");
    await expect.poll(() => preview.locator("html").evaluate((el) => getComputedStyle(el).getPropertyValue("--accent").trim()), { timeout: 1_000 }).toBe("#1f5f5b");
    await expect(page.getByText("Hard to read as text")).toHaveCount(0);

    // A low-contrast accent gets the warning and a one-click fix (ED-2).
    await hex.fill("#F5E663");
    await expect(page.locator(".ed-warn")).toContainText("Hard to read as text");
    await expectNoA11yViolations(page, "colours step with contrast warning");
    await page.getByRole("button", { name: "Keep mine" }).click();
    await hex.fill("#1F5F5B");

    // Sections: hide "Hours & location"; the preview re-renders without it.
    await step(page, "Sections").click();
    await page.getByRole("switch", { name: "Show Hours & location" }).click();
    await expect(preview.locator("#sec-visit")).toHaveCount(0, { timeout: 15_000 });
    await expectNoA11yViolations(page, "sections step");

    // Content: upload a gallery photo and describe it.
    await step(page, "Content").click();
    await page.getByRole("button", { name: "Add photos" }).click();
    const picker = page.getByRole("dialog", { name: "Add gallery photos" });
    await picker.locator('input[type="file"]').setInputFiles(TEST_PHOTO);
    await picker.getByRole("button", { name: /^Add 1 photo$/ }).click();
    await page.getByRole("button", { name: "Edit photo without description" }).click();
    const photo = page.getByRole("dialog", { name: "Photo" });
    await photo.getByLabel("Describe the photo (alt text)").fill("Fresh taper, side view");
    await photo.getByRole("button", { name: "Save photo" }).click();
    await expect(photo).toBeHidden();
    await expect(page.getByRole("button", { name: "Edit Fresh taper, side view" })).toBeVisible();
    await expect(page.getByText(/Draft · saved/)).toBeVisible({ timeout: 10_000 });
    await expectNoA11yViolations(page, "content step");

    // Nothing is public yet.
    await visitor.reload();
    expect(await cssVar(visitor, "--accent")).toBe(originalAccent);
    await expect(visitor.locator("#sec-visit")).toBeVisible();
    await expect(visitor.locator("#sec-gallery .sf-tile")).toHaveCount(0);

    // Publish.
    await step(page, "Publish").click();
    await expectNoA11yViolations(page, "publish step");
    await page.getByRole("button", { name: "Publish changes" }).click();
    await expect(page.getByText("Published. Your storefront is live.")).toBeVisible();
    await expect(page.getByText("Published · no changes")).toBeVisible();

    await visitor.reload();
    expect(await cssVar(visitor, "--accent")).toBe("#1f5f5b");
    await expect(visitor.locator("#sec-visit")).toHaveCount(0);
    await expect(visitor.locator("#sec-gallery .sf-tile")).toHaveCount(1);
    await expect(visitor.getByRole("button", { name: "Open photo 1 of 1" })).toBeVisible();
    await visitorCtx.close();
  });

  test("draft previews are for owners only", async ({ browser, isMobile }) => {
    test.skip(isMobile, "HTTP checks run once.");
    // Signed out → sent to sign in, no draft cookie.
    const anon = await browser.newContext();
    const a = await anon.newPage();
    await a.goto("/api/preview?shop=kaiser");
    await expect(a).toHaveURL(/\/login$/);
    // Even with Draft Mode forced on, a stranger only ever gets the published page.
    expect((await a.request.get("/api/preview?shop=kaiser&path=//evil.example")).status()).toBe(400);
    await anon.close();
  });

  test("editor works on a phone and has no a11y violations", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile layout check.");
    test.setTimeout(90_000);
    await signIn(page);
    await page.goto("/admin/lune/storefront");
    await expect(page.getByRole("heading", { level: 2, name: /Preset/ })).toBeVisible();
    await expect(page.frameLocator("iframe.ed-preview-iframe").locator("#top")).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: "Next: Colours" }).click();
    await expect(page.getByRole("heading", { level: 2, name: /Colours/ })).toBeVisible();
    await expect(page.locator(".ed-top").getByRole("button", { name: "Publish" })).toBeVisible();
    await expectNoA11yViolations(page, "editor on a phone");
  });
});
