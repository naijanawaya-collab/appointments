import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One Postgres client for the whole app.
 *
 * - Locally: Docker Postgres (docker-compose.yml).
 * - Production: Neon's *pooled* connection string. `prepare: false` keeps
 *   postgres-js compatible with Neon's PgBouncer pooling.
 * - In dev, the client is cached on globalThis so hot reloads don't
 *   open a new connection pool on every file save.
 */
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local first.");
  }
  return postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 5 : 10 });
}

const client = globalForDb.pgClient ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type Db = typeof db;
export { schema };
