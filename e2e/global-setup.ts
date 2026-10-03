import { execFileSync } from "node:child_process";
import { E2E_DATABASE_URL, prepareDatabase } from "../tests/support/database";

export const E2E_ADMIN = { email: "e2e-admin@example.com", password: "e2e-password-123" };

/** Fresh database for every e2e run: migrate + seed the demo shop. */
export default async function globalSetup() {
  await prepareDatabase(E2E_DATABASE_URL, { fresh: true });
  execFileSync("pnpm", ["db:seed"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      SEED_ADMIN_EMAIL: E2E_ADMIN.email,
      SEED_ADMIN_PASSWORD: E2E_ADMIN.password,
    },
  });
}
