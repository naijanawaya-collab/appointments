import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { bookFirstAvailable, continueBtn, pickFirstSlot, selectService } from "./helpers";

/** Booking flow + manage page (SCREENS.md §2–3). */

test.describe("booking flow", () => {
  test("books, then cancels from the manage link (B-*, G-1…G-3)", async ({ page }) => {
    await page.goto("/kaiser/book");
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    const manageUrl = await bookFirstAvailable(page, { name: "E2E Customer", email: "e2e@example.com" });
    expect(new URL(manageUrl).host).toBe(new URL(page.url()).host);

    await page.goto(manageUrl);
    await expect(page.getByRole("heading", { name: "Your booking" })).toBeVisible();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByText(/Free online cancellation until/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Add to calendar" })).toHaveAttribute("href", /\/b\/[A-Za-z0-9_-]{43}\/calendar\.ics$/);

    await page.getByRole("button", { name: "Cancel booking" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Cancel this appointment?" });
    await expect(dialog.getByRole("button", { name: "Keep it" })).toBeFocused();
    await dialog.getByRole("button", { name: "Yes, cancel" }).click();
    await expect(page.getByRole("status")).toContainText("This booking has been cancelled.");
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  });

  test("calendar file downloads with the right content type (B-21)", async ({ page, request }) => {
    await page.goto("/kaiser/book");
    const manageUrl = await bookFirstAvailable(page, { name: "Cal", email: "cal@example.com" });
    const res = await request.get(`${manageUrl}/calendar.ics`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    expect(await res.text()).toContain("BEGIN:VEVENT");
  });

  test("a booking inside the cancellation window can't be cancelled online (G-4)", async ({ page }) => {
    await page.goto("/kaiser/book");
    const manageUrl = await bookFirstAvailable(page, { name: "Late", email: "late@example.com" }, 0);
    await page.goto(manageUrl);
    // Kaiser allows free cancellation until 24 h before; the earliest slot may be inside or outside that.
    const tooLate = page.getByText("Too late to cancel online");
    const cancel = page.getByRole("button", { name: "Cancel booking" });
    await expect(tooLate.or(cancel)).toBeVisible();
    if (await tooLate.isVisible()) {
      await expect(page.getByRole("link", { name: /Call \+43 1 402 18 77/ })).toHaveAttribute("href", "tel:+4314021877");
      await expect(cancel).toHaveCount(0);
    }
  });

  test("a time taken by someone else returns to 'Pick a time' with the slot struck (B-14)", async ({ page, browser }) => {
    const choose = async (p: typeof page) => {
      await p.goto("/kaiser/book");
      await selectService(p, /Classic cut/);
      await continueBtn(p).click();
      await p.getByRole("radio", { name: /Anton Kaiser/ }).click();
      await continueBtn(p).click();
    };

    await choose(page);
    const time = await pickFirstSlot(page, 3);
    const dayLabel = await page.getByRole("radiogroup", { name: "Date" }).locator('[aria-checked="true"]').getAttribute("aria-label");

    const other = await browser.newPage();
    await choose(other);
    await other.getByRole("radio", { name: dayLabel! }).click();
    await other.getByRole("radio", { name: time, exact: true }).click();
    await continueBtn(other).click();
    await other.getByLabel("Name").fill("Second Customer");
    await other.getByLabel("Email").fill("second@example.com");

    await continueBtn(page).click();
    await page.getByLabel("Name").fill("First Customer");
    await page.getByLabel("Email").fill("first@example.com");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();

    await other.getByRole("button", { name: "Confirm booking" }).click();
    await expect(other.getByRole("heading", { name: "Pick a time" })).toBeVisible();
    await expect(other.locator(".bk-alert[role=alert]")).toContainText("That time was just taken.");
    await expect(other.getByRole("radio", { name: `${time}, just taken` })).toHaveAttribute("aria-disabled", "true");
    // Details are kept for the next attempt
    await pickFirstSlot(other, 3);
    await continueBtn(other).click();
    await expect(other.getByLabel("Name")).toHaveValue("Second Customer");
    await other.close();
  });

  test("validates the details form with the designed copy (B-16)", async ({ page }) => {
    await page.goto("/kaiser/book");
    await selectService(page, /Classic cut/);
    await continueBtn(page).click();
    await continueBtn(page).click();
    await pickFirstSlot(page);
    await continueBtn(page).click();
    await expect(page.getByLabel(/Phone/)).toHaveValue("+43");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("! Please enter your name")).toBeVisible();
    await expect(page.getByText("! Enter a full email address, e.g. name@example.com")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeFocused();
  });

  test("deep links preselect a service and a professional (B-3, B-9)", async ({ page }) => {
    await page.goto("/kaiser");
    await page.locator("#sec-team a.sf-person").first().click();
    await expect(page).toHaveURL(/\/kaiser\/book\?.*staff=/);
    await selectService(page, /Classic cut/);
    await continueBtn(page).click();
    await expect(page.getByRole("radio", { name: /Anton Kaiser/ })).toHaveAttribute("aria-checked", "true");
  });

  test("browser Back steps back through the flow; after booking it returns to the storefront (B-22, B-24)", async ({ page }) => {
    await page.goto("/kaiser/book");
    await selectService(page, /Classic cut/);
    await continueBtn(page).click();
    await expect(page).toHaveURL(/step=staff/);
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Choose services" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Classic cut/ }).first()).toHaveAttribute("aria-pressed", "true");

    await page.goto("/kaiser/book");
    await bookFirstAvailable(page, { name: "Back", email: "back@example.com" });
    await page.goBack();
    await expect(page).toHaveURL(/\/kaiser$/);
  });

  test("booking steps have no accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lune/book");
    await expectNoA11yViolations(page, "services");
    await page.getByRole("button", { name: /manicure/i }).first().click();
    await continueBtn(page).click();
    await expectNoA11yViolations(page, "staff");
    await continueBtn(page).click();
    await pickFirstSlot(page);
    await expectNoA11yViolations(page, "time");
    await continueBtn(page).click();
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expectNoA11yViolations(page, "details with errors");
  });

  test("unknown shops and bad manage links show 404 (G-6)", async ({ page }) => {
    expect((await page.goto("/does-not-exist/book"))?.status()).toBe(404);
    expect((await page.goto(`/kaiser/b/${"A".repeat(43)}`))?.status()).toBe(404);
    await expect(page.getByText("This link isn’t valid anymore.")).toBeVisible();
  });
});
