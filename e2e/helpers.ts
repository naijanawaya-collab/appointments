import { expect, type Page } from "@playwright/test";

export const continueBtn = (page: Page) => page.getByRole("button", { name: "Continue" });

/** Selects a service (a restored session may already have it selected). */
export async function selectService(page: Page, name: RegExp) {
  const btn = page.getByRole("button", { name }).first();
  await expect(btn).toBeVisible();
  if ((await btn.getAttribute("aria-pressed")) !== "true") await btn.click();
}

/** Selects the first open day at or after `minOffset` days from today that has a free slot, and picks that slot. */
export async function pickFirstSlot(page: Page, minOffset = 2): Promise<string> {
  const group = page.getByRole("radiogroup", { name: "Date" });
  const days = group.getByRole("radio");
  await expect(days.first()).toBeVisible();
  // Closed days are only known once the opening days have loaded; a day is
  // auto-selected at that moment (B-10). Checking earlier would race.
  await expect(group.locator('[aria-checked="true"]')).toHaveCount(1);
  const count = await days.count();
  for (let i = minOffset; i < count; i++) {
    const day = days.nth(i);
    if ((await day.getAttribute("aria-disabled")) === "true") continue;
    await day.click();
    const slot = page.locator(".bk-slots [role=radio]:not([aria-disabled=true])").first();
    const empty = page.getByText(/^No free times on/);
    await expect(slot.or(empty)).toBeVisible();
    if (await slot.isVisible()) {
      const time = (await slot.textContent())!.replace("✓", "").trim();
      await slot.click();
      return time;
    }
  }
  throw new Error("expected at least one bookable time in the booking horizon");
}

/**
 * Walks the booking flow: Classic cut → any professional → first free time
 * (≥ `minOffset` days ahead, so it's inside the free-cancellation window) →
 * details → confirm. Returns the manage URL.
 */
export async function bookFirstAvailable(page: Page, customer: { name: string; email: string }, minOffset = 2) {
  await selectService(page, /Classic cut/);
  await continueBtn(page).click();
  await expect(page.getByRole("heading", { name: "Choose a professional" })).toBeVisible();
  await continueBtn(page).click();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await pickFirstSlot(page, minOffset);
  await continueBtn(page).click();

  await page.getByLabel("Name").fill(customer.name);
  await page.getByLabel("Email").fill(customer.email);
  await page.getByRole("button", { name: "Confirm booking" }).click();

  await expect(page.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Manage or cancel" }).getAttribute("href");
  expect(href).toMatch(/\/b\/[A-Za-z0-9_-]{43}$/);
  return href!;
}
