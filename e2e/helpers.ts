import { expect, type Page } from "@playwright/test";

/**
 * Walks the booking wizard: Haircut → any professional → first free time
 * (searching forward day by day) → details → confirm. Returns the manage URL.
 */
export async function bookFirstAvailable(page: Page, customer: { name: string; email: string }) {
  await page.getByRole("button", { name: /Classic cut/ }).first().click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Choose a professional" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();

  const days = page.getByRole("radiogroup", { name: "Date" }).getByRole("radio");
  const dayCount = await days.count();
  let picked = false;
  // Start two days out so the booking is still inside every shop's free-cancellation window.
  for (let i = 2; i < dayCount && !picked; i++) {
    await days.nth(i).click();
    const firstTime = page.getByRole("radiogroup", { name: /times$/ }).getByRole("radio").first();
    const empty = page.getByText("No free times on this day");
    await expect(firstTime.or(empty)).toBeVisible();
    if (await firstTime.isVisible()) {
      await firstTime.click();
      picked = true;
    }
  }
  expect(picked, "expected at least one bookable time in the booking horizon").toBe(true);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Name").fill(customer.name);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Manage or cancel" }).getAttribute("href");
  expect(href).toMatch(/\/b\/[A-Za-z0-9_-]{43}$/);
  return href!;
}
