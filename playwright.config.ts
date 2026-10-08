import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/appointments_e2e";

/**
 * End-to-end tests run against a production build (`next build && next start`)
 * and their own database (appointments_e2e), freshly migrated and seeded.
 *
 * Tests run one at a time: they book real slots in a shared database.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Optional: point at a locally installed Chromium if Playwright's download is blocked.
    launchOptions: process.env.PW_CHROMIUM_EXECUTABLE
      ? {
          executablePath: process.env.PW_CHROMIUM_EXECUTABLE,
          args: process.env.PW_CHROMIUM_ARGS?.split(" ").filter(Boolean),
        }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // HTTP-level security checks only need to run once.
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /security\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-123",
      BETTER_AUTH_URL: `http://localhost:${PORT}`,
      PLATFORM_HOSTS: "localhost,127.0.0.1",
      EMAIL_DRIVER: "console",
      // The suite books many slots from one IP; production keeps the default (10).
      RATE_LIMIT_BOOKINGS: "200",
      AUTH_RATE_LIMIT: "off",
      // The seeded admin is also a platform operator (creates shops in admin.spec.ts).
      PLATFORM_ADMIN_EMAILS: "e2e-admin@example.com",
    },
  },
});
