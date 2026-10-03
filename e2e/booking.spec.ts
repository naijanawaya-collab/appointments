import { expect, test } from "@playwright/test";
import { bookFirstAvailable } from "./helpers";

test.describe("customer booking flow", () => {
  test("books an appointment, then cancels it from the manage link", async ({ page }) => {
    await page.goto("/book/demo-barber");
    await expect(page.getByRole("heading", { level: 1, name: "Demo Barbershop" })).toBeVisible();

    const manageUrl = await bookFirstAvailable(page, { name: "E2E Customer", email: "e2e@example.com" });
    expect(new URL(manageUrl).host).toBe(new URL(page.url()).host);

    await page.goto(manageUrl);
    await expect(page.getByRole("heading", { name: "Your booking" })).toBeVisible();
    await expect(page.getByText("Confirmed")).toBeVisible();
    await expect(page.getByText("Haircut")).toBeVisible();

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("button", { name: "Yes, cancel" }).click();
    await expect(page.getByRole("status")).toContainText("This booking has been cancelled");

    // Still cancelled after a reload (server state, not just client state).
    await page.reload();
    await expect(page.getByRole("status")).toContainText("This booking has been cancelled");
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  });

  test("a booked time disappears for the next customer", async ({ page, browser }) => {
    await page.goto("/book/demo-barber");
    await page.getByRole("button", { name: /Haircut/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    // Pick a specific barber so the slot becomes unavailable after one booking.
    await page.getByRole("radio", { name: /Barber One/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    const days = page.getByRole("radiogroup", { name: "Date" }).getByRole("radio");
    let time = "";
    for (let i = 0; i < (await days.count()) && !time; i++) {
      await days.nth(i).click();
      const first = page.getByRole("radiogroup", { name: /times$/ }).getByRole("radio").first();
      await expect(first.or(page.getByText("No free times on this day"))).toBeVisible();
      if (await first.isVisible()) {
        time = (await first.textContent())!;
        // Second customer opens the same page and picks the same time…
        const other = await browser.newPage();
        await other.goto("/book/demo-barber");
        await other.getByRole("button", { name: /Haircut/ }).first().click();
        await other.getByRole("button", { name: "Continue" }).click();
        await other.getByRole("radio", { name: /Barber One/ }).click();
        await other.getByRole("button", { name: "Continue" }).click();
        await other.getByRole("radiogroup", { name: "Date" }).getByRole("radio").nth(i).click();
        await other.getByRole("radio", { name: time, exact: true }).click();
        await other.getByRole("button", { name: "Continue" }).click();
        await other.getByLabel("Name").fill("Second Customer");
        await other.getByLabel("Email").fill("second@example.com");

        // …but the first customer confirms first.
        await first.click();
        await page.getByRole("button", { name: "Continue" }).click();
        await page.getByLabel("Name").fill("First Customer");
        await page.getByLabel("Email").fill("first@example.com");
        await page.getByRole("button", { name: "Confirm booking" }).click();
        await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();

        await other.getByRole("button", { name: "Confirm booking" }).click();
        await expect(other.getByRole("heading", { name: "Pick a time" })).toBeVisible();
        await expect(other.getByText(/just booked that time|no longer available/)).toBeVisible();
        await expect(other.getByRole("radio", { name: time, exact: true })).toHaveCount(0);
        await other.close();
      }
    }
    expect(time).not.toBe("");
  });

  test("validates the details form before submitting", async ({ page }) => {
    await page.goto("/book/demo-barber");
    await page.getByRole("button", { name: /Haircut/ }).first().click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    const days = page.getByRole("radiogroup", { name: "Date" }).getByRole("radio");
    for (let i = 0; i < (await days.count()); i++) {
      await days.nth(i).click();
      const first = page.getByRole("radiogroup", { name: /times$/ }).getByRole("radio").first();
      await expect(first.or(page.getByText("No free times on this day"))).toBeVisible();
      if (await first.isVisible()) {
        await first.click();
        break;
      }
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: "Confirm booking" }).click();
    await expect(page.getByText("Please enter your name")).toBeVisible();
    await expect(page.getByText("Enter a valid email address")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your details" })).toBeVisible();
  });

  test("unknown shops and bad manage links show 404", async ({ page }) => {
    expect((await page.goto("/book/does-not-exist"))?.status()).toBe(404);
    expect((await page.goto(`/manage/${"A".repeat(43)}`))?.status()).toBe(404);
  });
});
