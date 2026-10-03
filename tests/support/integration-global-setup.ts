import { prepareDatabase, TEST_DATABASE_URL } from "./database";

/** Vitest globalSetup for the integration project: fresh, migrated test DB per run. */
export default async function setup() {
  await prepareDatabase(TEST_DATABASE_URL, { fresh: true });
}
