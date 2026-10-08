import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations } from "./a11y";
import { continueBtn, pickFirstSlot, selectService } from "./helpers";
import { E2E_ADMIN } from "./global-setup";

/** Owner admin + operator (MVP-PLAN M4). The seeded admin owns the demo shops and is an operator. */

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/[a-z0-9-]+$/);
}

/** The next Wednesday at least 2 days ahead (every demo shop is open on Wednesdays). */
function nextWednesday() {
  const d = new Date(Date.now() + 2 * 86_400_000);
  while (d.getUTCDay() !== 3) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test.describe("admin", () => {
  test("redirects to login when signed out", async ({ page }) => {
    await page.goto("/admin/kaiser/services");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("rejects a wrong password with the designed copy, then signs in and out", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("! Email or password is incorrect.")).toBeVisible();
    await expect(page.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Password").fill(E2E_ADMIN.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin\/(fadelab|kaiser|lune)$/);
    await expect(page.getByText("Bookings today")).toBeVisible();

    await page.goto(`${new URL(page.url()).pathname}/more`);
    await page.getByRole("button", { name: "Sign out" }).last().click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("forgot password never reveals whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password?email=nobody%40example.com");
    await expect(page.getByLabel("Email")).toHaveValue("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("If an account exists for nobody@example.com");
    await page.goto("/reset-password?token=not-a-real-token");
    await page.getByLabel("New password").fill("a-new-password-1");
    await page.getByLabel("Repeat password").fill("a-new-password-1");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("This link has expired or was already used.")).toBeVisible();
  });

  test("operator creates a shop → owner accepts the invite, sets it up → a customer books → it shows in the admin", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const slug = `e2e-${Date.now().toString(36)}`;
    const owner = { email: `owner@${slug}.test`, password: "owner-password-1" };

    // Operator
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto("/admin/shops");
    await page.getByLabel("Shop name").fill("E2E Cutz");
    await page.getByLabel("Address on the platform").fill(slug);
    await page.getByLabel("Owner’s name").fill("Mba Owner");
    await page.getByLabel("Owner’s email").fill(owner.email);
    await page.getByRole("button", { name: "Create shop" }).click();
    await expect(page.getByText("is ready and the owner was emailed an invite")).toBeVisible();
    const inviteUrl = (await page.locator("code").first().textContent())!;
    expect(inviteUrl).toMatch(/\/reset-password\?invite=1&token=/);

    // Owner, in a fresh browser
    const ctx = await browser.newContext();
    const o = await ctx.newPage();
    await o.goto(inviteUrl);
    await expect(o.getByRole("heading", { name: "Welcome aboard" })).toBeVisible();
    await o.getByLabel("New password").fill(owner.password);
    await o.getByLabel("Repeat password").fill(owner.password);
    await o.getByRole("button", { name: "Save password" }).click();
    await expect(o).toHaveURL(/\/login\?reset=1$/);
    await signIn(o, owner.email, owner.password);
    await expect(o).toHaveURL(new RegExp(`/admin/${slug}$`));
    // The invite link is single-use.
    await o.goto(inviteUrl);
    await o.getByLabel("New password").fill("another-pass-1");
    await o.getByLabel("Repeat password").fill("another-pass-1");
    await o.getByRole("button", { name: "Save password" }).click();
    await expect(o.getByText("This link has expired or was already used.")).toBeVisible();
    // Tenant isolation: another shop's admin doesn't exist for this owner.
    expect((await o.goto("/admin/kaiser"))?.status()).toBe(404);

    // Opening hours: every day 09:00–18:00
    await o.goto(`/admin/${slug}/hours`);
    const addHours = o.getByRole("button", { name: "Add hours" });
    while ((await addHours.count()) > 0) await addHours.first().click();
    await o.getByRole("button", { name: "Save hours" }).click();
    await expect(o.getByText("Opening hours saved.")).toBeVisible();

    // A service
    await o.goto(`/admin/${slug}/services/new`);
    await o.getByLabel("Name", { exact: true }).fill("Skin fade");
    await o.getByLabel("Duration (minutes)").fill("30");
    await o.getByLabel("Price").fill("25");
    await o.getByRole("button", { name: "Create service" }).click();
    await expect(o).toHaveURL(new RegExp(`/admin/${slug}/services/[0-9a-f-]{36}$`));

    // A professional (gets the shop's hours and, by default, every service)
    await o.goto(`/admin/${slug}/team/new`);
    await o.getByLabel("Name", { exact: true }).fill("Mba");
    await expect(o.getByRole("checkbox", { name: "Skin fade" })).toBeChecked();
    await o.getByRole("button", { name: "Add to team" }).click();
    await expect(o).toHaveURL(new RegExp(`/admin/${slug}/team/[0-9a-f-]{36}$`));
    await expect(o.getByRole("group", { name: "Monday" }).getByLabel("Monday opens")).toHaveValue("09:00");

    // A customer books on the public storefront (one professional → no staff step)
    const c = await ctx.newPage();
    await c.goto(`/${slug}/book`);
    await selectService(c, /Skin fade/);
    await continueBtn(c).click();
    await expect(c.getByRole("heading", { name: "Pick a time" })).toBeVisible();
    await pickFirstSlot(c, 1);
    await continueBtn(c).click();
    await c.getByLabel("Name").fill("Ada Customer");
    await c.getByLabel("Email").fill("ada@example.com");
    await c.getByRole("button", { name: "Confirm booking" }).click();
    await expect(c.getByRole("heading", { name: "Booking confirmed" })).toBeVisible();

    // …and the owner sees it, opens it and cancels it
    await o.goto(`/admin/${slug}/bookings`);
    await o.getByRole("link", { name: "Ada Customer" }).click();
    await expect(o.getByRole("heading", { name: /Ada Customer/ })).toBeVisible();
    await expect(o.getByText("Skin fade", { exact: true })).toBeVisible();
    await o.getByRole("button", { name: "Cancel booking" }).click();
    await o.getByLabel("Reason (optional)").fill("Barber is ill");
    await o.getByRole("button", { name: "Yes, cancel booking" }).click();
    await expect(o.getByText("Barber is ill")).toBeVisible(); // the page re-rendered as cancelled
    await expect(o.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
    await ctx.close();
  });

  test("walk-in booking from the dashboard", async ({ page }) => {
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto(`/admin/kaiser/bookings/new?date=${nextWednesday()}`);
    await page.getByRole("checkbox", { name: /Beard trim/ }).check();
    const slot = page.locator(".ad-check:has(input[type=radio][name=startsAt])").first();
    await slot.click();
    await page.getByLabel("Name").fill("Walk In Willy");
    await page.getByRole("button", { name: "Add booking" }).click();
    await expect(page.getByRole("heading", { name: /Walk In Willy/ })).toBeVisible();
    await expect(page.getByText("Walk-in ·")).toBeVisible();
  });

  test("custom domain: add → DNS instructions → remove", async ({ page }, info) => {
    const apex = `lune-${info.project.name}-e2e.com`;
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto("/admin/lune/domain");
    const input = page.getByRole("textbox", { name: "Domain" });
    await input.fill(`https://www.${apex.toUpperCase()}/`);
    await page.getByRole("button", { name: "Connect domain" }).click();
    await expect(page.getByText("Domain added.")).toBeVisible();

    const records = page.getByRole("table");
    await expect(records.getByRole("row", { name: new RegExp(`^${apex.replaceAll(".", "\\.")} A @ 76\\.76\\.21\\.21`) })).toBeVisible();
    await expect(records.getByRole("row", { name: new RegExp(`^www\\.${apex.replaceAll(".", "\\.")} CNAME www cname\\.vercel-dns\\.com`) })).toBeVisible();
    await expect(page.locator(".ad-row", { hasText: `www.${apex}` }).getByText("Pending DNS")).toBeVisible();

    await input.fill("localhost");
    await page.getByRole("button", { name: "Connect domain" }).click();
    await expect(page.getByText(/doesn't look like a domain/)).toBeVisible();

    for (const host of [`www.${apex}`, apex]) {
      const row = page.locator(".ad-row").filter({ has: page.getByText(host, { exact: true }) });
      await row.getByRole("button", { name: "Remove" }).click();
      await row.getByRole("button", { name: "Disconnect" }).click();
      await expect(row).toHaveCount(0);
    }
  });

  test("admin screens have no accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/login");
    await expectNoA11yViolations(page, "login");
    await signIn(page, E2E_ADMIN.email, E2E_ADMIN.password);
    for (const path of ["/admin/kaiser", "/admin/kaiser/bookings", "/admin/kaiser/services", "/admin/kaiser/hours", "/admin/kaiser/settings", "/admin/kaiser/domain"]) {
      await page.goto(path);
      await expectNoA11yViolations(page, path);
    }
  });
});
