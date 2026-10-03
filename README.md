# Appointments

Online booking for barbershops (and other appointment-based businesses), built
**multi-tenant from day one**: the first shop is tenant #1 of a platform, not a
one-off site.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM +
PostgreSQL (Docker locally, Neon in production) · Better Auth · TanStack React
Query · React Hook Form · Zod · pnpm

---

## Quick start

Prerequisites: **Node 20.9+** (22 recommended, see `.nvmrc`), **pnpm**
(`corepack enable`), **Docker Desktop**.

```bash
pnpm install
cp .env.example .env.local      # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:setup                   # starts Postgres in Docker, runs migrations, seeds demo data
pnpm dev
```

Then open:

| URL | What you'll see |
| --- | --- |
| http://localhost:3000 | Platform landing page |
| http://localhost:3000/book/demo-barber | Demo shop's booking page (platform URL) |
| http://demo-barber.localhost:3000 | **Same shop via a "custom domain"** (`*.localhost` resolves to your machine) |
| http://localhost:3000/login | Admin sign-in (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env.local`) |
| http://localhost:3000/admin | Dashboard (signed in) |

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` / `lint` | TypeScript / ESLint |
| `pnpm db:up` / `db:down` | Start / stop the local Postgres container |
| `pnpm db:generate --name <change>` | Create a migration from schema changes |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm db:seed` | Seed demo business + admin user (safe to re-run) |
| `pnpm db:studio` | Browse the database in Drizzle Studio |
| `pnpm db:reset` | Wipe the local DB volume and start fresh |
| `pnpm db:setup` | `db:up` + `db:migrate` + `db:seed` |

## Project structure

```
drizzle/                    SQL migrations (0001 = no-double-booking constraint)
src/
  proxy.ts                  Next 16 "proxy" (ex-middleware): custom domain -> /sites/[host]
  app/
    page.tsx                Platform landing
    book/[slug]/            Storefront by slug   (platform URL)
    sites/[host]/           Storefront by domain (custom domains, via proxy rewrite)
    login/                  Admin sign-in (React Hook Form + Zod + Better Auth)
    admin/                  Protected dashboard
    api/auth/[...all]/      Better Auth handler
    api/businesses/[businessId]/catalog/   Public services + staff (React Query)
  components/
    providers.tsx           React Query provider
    storefront/             Booking UI shared by both storefront routes
  domain/                   Business logic – no React/Next imports
    business/               resolveBusiness (slug or hostname)
    catalog/                Services/staff queries + pure selection logic
    booking/                Status state machine + domain events
  db/
    schema/                 Drizzle tables (auth, tenancy, catalog, scheduling, bookings)
    index.ts                DB client (postgres-js; works for Docker and Neon)
    seed.ts                 Demo data
  lib/                      auth, session helpers, host detection, formatting
  validation/               Zod schemas shared by client and server
```

## How multi-tenancy works

```
request ──► proxy.ts
             ├─ platform host (localhost, *.vercel.app, PLATFORM_HOSTS)
             │     └─► normal routes: /, /login, /admin, /book/[slug]
             └─ any other host, e.g. brosbab.com
                   └─► rewrite to /sites/brosbab.com  (URL bar still shows brosbab.com)

/book/[slug]   ─► resolveBusiness({ slug })     ─┐
/sites/[host]  ─► resolveBusiness({ hostname }) ─┴─► <Storefront business={...} />
```

- Every tenant-owned table has `business_id`. Adding shop #2 is inserting rows, not new code.
- Domains live in `business_domains` (one shop can have `brosbab.com` **and** `www.brosbab.com`).
- Customers book as guests (no account). Better Auth is for owners/staff on the platform domain.

### Data model

`businesses` · `business_domains` · `members` (user ↔ business, role) · `staff` ·
`services` · `staff_services` · `working_hours` · `time_off` · `customers` ·
`bookings` · `booking_services` (price/duration snapshot) · Better Auth's
`user`/`session`/`account`/`verification`.

**Double bookings are impossible at the database level:** an exclusion
constraint rejects any two `pending`/`confirmed` bookings for the same
professional with overlapping times (SQLSTATE `23P01`).

## Connecting a real custom domain (manual, for now)

1. Add the domain to the Vercel project (Project → Settings → Domains), e.g.
   `brosbab.com` and `www.brosbab.com`.
2. Have the domain owner create the DNS records Vercel shows.
3. Insert the hostname for the business:
   ```sql
   INSERT INTO business_domains (business_id, hostname, is_primary)
   VALUES ('<business-id>', 'brosbab.com', true),
          ('<business-id>', 'www.brosbab.com', false);
   ```
   (or add rows in `pnpm db:studio`). Nothing else changes in code.

## Deploying (Vercel + Neon)

1. Create a Neon project (EU region, e.g. Frankfurt, if the business is in the EU).
   Copy the **pooled** connection string.
2. Run migrations against Neon once from your machine:
   `DATABASE_URL="<neon-url>" pnpm db:migrate` (and `pnpm db:seed` if you want the demo data/admin).
3. Import the GitHub repo in Vercel and set env vars: `DATABASE_URL`,
   `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your production URL),
   `PLATFORM_HOSTS` (your platform domain, if you add one).
4. Set the Functions region close to the database (e.g. `fra1`).

> **Plan note:** Vercel's free Hobby plan is for non-commercial use only. A live
> booking site for a business needs the Pro plan (or another host).

## Roadmap

- **Phase 0 – foundation ✅** (this commit): app, schema, migrations, seed, auth, tenancy, proxy.
- **Phase 1 – booking flow:** `getAvailableSlots()` (working hours − time off − bookings,
  in the business timezone), date/time picker, guest details, `createBooking` with
  overlap handling, confirmation email (Resend), manage/cancel link.
- **Phase 2 – admin:** day/week calendar, manual & walk-in bookings, CRUD for
  services/staff/hours/time off, mark completed / no-show.
- **Phase 3 – launch polish:** reminder emails (daily cron), new-booking notifications,
  PWA, Impressum + privacy policy, connect the custom domain.
