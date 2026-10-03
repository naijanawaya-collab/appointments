/**
 * Seeds one demo tenant + the first admin login.
 *
 *   pnpm db:seed
 *
 * Safe to re-run: it skips anything that already exists.
 * Edit the DEMO object to match the real shop (name, services, barbers, hours),
 * or change them later from the admin once those screens exist.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const DEMO = {
  business: {
    name: "Demo Barbershop",
    slug: "demo-barber",
    timezone: "Europe/Vienna",
    currency: "EUR",
    locale: "de-AT",
    description: "Classic cuts, fades and beard care.",
  },
  // `*.localhost` resolves to 127.0.0.1 in modern browsers, so you can test the
  // custom-domain flow locally at http://demo-barber.localhost:3000
  domains: [{ hostname: "demo-barber.localhost", isPrimary: true }],
  services: [
    { name: "Haircut", durationMin: 30, bufferMin: 5, priceCents: 2500, category: "Hair" },
    { name: "Skin fade", durationMin: 45, bufferMin: 5, priceCents: 3000, category: "Hair" },
    { name: "Beard trim", durationMin: 20, bufferMin: 5, priceCents: 1500, category: "Beard" },
    { name: "Haircut + beard", durationMin: 50, bufferMin: 10, priceCents: 3800, category: "Combo" },
  ],
  staff: [
    { displayName: "Barber One", title: "Owner & Barber" },
    { displayName: "Barber Two", title: "Barber" },
  ],
  // ISO weekday (1 = Mon ... 7 = Sun). Two rows on a day = lunch break.
  hours: [
    ...[2, 3, 4, 5].flatMap((weekday) => [
      { weekday, startTime: "09:00", endTime: "13:00" },
      { weekday, startTime: "14:00", endTime: "19:00" },
    ]),
    { weekday: 6, startTime: "09:00", endTime: "16:00" },
  ],
};

async function main() {
  // Imported after env is loaded.
  const { db } = await import("./index");
  const s = await import("./schema");

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "change-me-please";

  await db.transaction(async (tx) => {
    // 1. Admin user (Better Auth email + password)
    let [admin] = await tx.select().from(s.user).where(eq(s.user.email, adminEmail));
    if (!admin) {
      const id = randomUUID();
      [admin] = await tx
        .insert(s.user)
        .values({ id, name: "Admin", email: adminEmail, emailVerified: true })
        .returning();
      await tx.insert(s.account).values({
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

    // 2. Business (tenant)
    const [existing] = await tx
      .select()
      .from(s.businesses)
      .where(eq(s.businesses.slug, DEMO.business.slug));
    if (existing) {
      console.log(`• business "${existing.slug}" already exists – skipping catalog seed`);
      return;
    }
    const [business] = await tx.insert(s.businesses).values(DEMO.business).returning();
    console.log(`✓ business ${business.name} (/book/${business.slug})`);

    await tx.insert(s.members).values({ businessId: business.id, userId: admin.id, role: "owner" });
    await tx
      .insert(s.businessDomains)
      .values(DEMO.domains.map((d) => ({ ...d, businessId: business.id })));

    // 3. Services
    const services = await tx
      .insert(s.services)
      .values(DEMO.services.map((svc, i) => ({ ...svc, businessId: business.id, sortOrder: i })))
      .returning();

    // 4. Staff, what they can do, and when they work
    const staff = await tx
      .insert(s.staff)
      .values(DEMO.staff.map((st, i) => ({ ...st, businessId: business.id, sortOrder: i })))
      .returning();

    await tx
      .insert(s.staffServices)
      .values(staff.flatMap((st) => services.map((svc) => ({ staffId: st.id, serviceId: svc.id }))));

    await tx
      .insert(s.workingHours)
      .values(staff.flatMap((st) => DEMO.hours.map((h) => ({ ...h, staffId: st.id }))));

    console.log(`✓ ${services.length} services, ${staff.length} staff, working hours`);
  });

  console.log("\nDone. Log in at http://localhost:3000/login with the SEED_ADMIN_* credentials.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
