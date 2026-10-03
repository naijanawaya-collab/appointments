/**
 * Test database helpers shared by Vitest integration tests and Playwright e2e.
 *
 * Tests never touch your dev database: they use separate databases
 * (`appointments_test`, `appointments_e2e`) on the same Postgres server,
 * created and migrated automatically.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/appointments_test";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/appointments_e2e";

/** Creates the database if it doesn't exist, then applies all migrations. */
export async function prepareDatabase(url: string, { fresh = false } = {}) {
  const target = new URL(url);
  const dbName = target.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error(`Refusing odd database name: ${dbName}`);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1, onnotice: () => {} });
  try {
    if (fresh) {
      await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    }
    const [exists] = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (!exists) await admin.unsafe(`CREATE DATABASE ${dbName}`);
  } finally {
    await admin.end();
  }

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  } finally {
    await client.end();
  }
}
