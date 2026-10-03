import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/appointments_test";

/**
 * Three test layers:
 *
 *  unit        *.test.ts          pure logic, no DB, no DOM          (fast, run constantly)
 *  component   *.test.tsx         React components in jsdom          (fast)
 *  integration *.int.test.ts      domain code against real Postgres  (needs `pnpm db:up`)
 *
 * End-to-end browser tests live in /e2e and run with Playwright.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./tests/support/component-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          globalSetup: ["./tests/support/integration-global-setup.ts"],
          env: { DATABASE_URL: TEST_DATABASE_URL, EMAIL_DRIVER: "memory" },
          // One shared database: run files one at a time.
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
