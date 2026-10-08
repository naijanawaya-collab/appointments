/**
 * Seeds the first admin login and the demo shops.
 *
 *   pnpm db:seed                 admin + Kaiser, FADE/LAB, Lune
 *   SEED_STRESS=1 pnpm db:seed   … plus the test-plan stress shop
 *
 * Safe to re-run: existing users and shops are left untouched.
 * Demo shops get `<slug>.localhost` domains so the custom-domain flow works
 * locally (http://kaiser.localhost:3000).
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

async function main() {
  // Imported after env is loaded.
  const { db } = await import("./index");
  const s = await import("./schema");
  const { loadRawShops, seedShop, seedStressShop } = await import("./seed/demo-shops");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-please";

  let [admin] = await db.select().from(s.user).where(eq(s.user.email, adminEmail));
  if (!admin) {
    const id = randomUUID();
    [admin] = await db.insert(s.user).values({ id, name: "Admin", email: adminEmail, emailVerified: true }).returning();
    await db.insert(s.account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: await hashPassword(adminPassword),
    });
    console.log(`✓ admin user ${adminEmail}`);
  } else {
    console.log(`• admin user ${adminEmail} already exists`);
  }

  const opts = { ownerUserId: admin.id, localDomains: true };
  for (const raw of loadRawShops()) {
    const id = await seedShop(db, raw, opts);
    console.log(id ? `✓ shop ${raw.name} (/${raw.key})` : `• shop /${raw.key} already exists`);
  }
  if (process.env.SEED_STRESS === "1") {
    const id = await seedStressShop(db, opts);
    console.log(id ? "✓ stress shop (/stress)" : "• stress shop already exists");
  }

  console.log("\nDone. Sign in at http://localhost:3000/login with the SEED_ADMIN_* credentials.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
