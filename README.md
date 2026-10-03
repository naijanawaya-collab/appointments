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
| `pnpm test` | Unit + component tests (fast, no database) |
| `pnpm test:watch` | Same, in watch mode while you code |
| `pnpm test:integration` | Domain logic against a real Postgres (`pnpm db:up` first) |
| `pnpm test:e2e` | Playwright against a production build (desktop + mobile) |
| `pnpm test:all` | Everything above |

## Testing

Every feature ships with tests at the layer that fits it. CI runs all of them on
every push and pull request (`.github/workflows/ci.yml`).

| Layer | Files | Runs against | What it covers |
| --- | --- | --- | --- |
| Unit | `src/**/*.test.ts` | Node | Slot maths (incl. DST days), status machine, tokens, validation, rate limiter, wizard reducer |
| Component | `src/**/*.test.tsx` | jsdom + Testing Library | Booking wizard steps, validation errors, "slot taken" recovery, a11y of form fields, cancel form |
| Integration | `src/**/*.int.test.ts` | Real Postgres (`appointments_test`) | Availability, booking races (5 customers, 1 slot), tenant isolation, cancellation, emails |
| End-to-end | `e2e/*.spec.ts` | Chromium, production build, `appointments_e2e` | Full booking + cancel on the slug URL **and** a custom domain, admin login, CSRF/tenant/rate-limit checks |

Tests never touch your dev database: the test and e2e databases are created,
migrated (and for e2e, seeded) automatically on the same Postgres server.

First run of e2e locally: `pnpm exec playwright install chromium`.

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
    manage/[token]/         "Manage my booking" (emailed link) – also under sites/[host]/
    api/auth/[...all]/      Better Auth handler
    api/businesses/[businessId]/
      catalog/              GET services + staff
      availability/         GET free times for a day
      bookings/             POST create a guest booking
  components/
    providers.tsx           React Query provider
    storefront/             Storefront shell shared by both storefront routes
    booking/                Booking wizard (reducer + steps + API client)
    manage/                 Manage page + cancel server action
  domain/                   Business logic – no React/Next imports
    business/               resolveBusiness (slug or hostname)
    catalog/                Services/staff queries + pure selection logic
    availability/           computeSlots (pure, DST-safe) + DB loader
    booking/                create / cancel / read, manage tokens, status machine
    notifications/          Email templates + event handlers
  db/
    schema/                 Drizzle tables (auth, tenancy, catalog, scheduling, bookings)
    index.ts                DB client (postgres-js; works for Docker and Neon)
    seed.ts                 Demo data
  lib/                      auth, session, hosts, request guards, rate limit, email, formatting
  validation/               Zod schemas shared by client and server
tests/support/              Test DB setup + fixtures
e2e/                        Playwright specs
docs/design-prompt.md       Brief for the visual design
```

## How booking works

1. **Availability** – `computeSlots()` takes working hours (wall-clock, shop timezone),
   existing bookings and time off, and returns start times on the slot grid. Services must
   fit inside working hours; cleanup buffers block the calendar but may run past closing.
   Lead time and booking horizon come from the business settings.
2. **Booking** – the API re-validates everything, then `createBooking()` checks the time
   is genuinely offered and inserts it. If two people race for the same slot, the database
   constraint lets exactly one win; with "any professional" the next free barber is used.
3. **Manage link** – the customer gets a link with a 256-bit token (only its hash is stored)
   to view or cancel. Online cancellation closes `cancellationWindowHours` before the start.
4. **Emails** – confirmation to the customer, notification to the shop, both sent *after*
   the response (`after()`), so a slow email provider never slows down booking.

### Security measures

Same-origin check on booking POSTs (CSRF) · per-IP rate limits (in-memory; swap for
Redis/KV at scale) · Zod validation + body size cap + honeypot · tenant guard (a custom
domain can only read/write its own shop) · hashed manage tokens, `noindex` + `no-referrer`
on manage pages · security headers (HSTS, nosniff, frame-deny) · HTML-escaped emails ·
public sign-up disabled for admins.

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
   `PLATFORM_HOSTS` (your platform domain, if you add one),
   `RESEND_API_KEY` + `EMAIL_FROM` (a sender on a domain verified in Resend).
4. Set the Functions region close to the database (e.g. `fra1`).

> **Plan note:** Vercel's free Hobby plan is for non-commercial use only. A live
> booking site for a business needs the Pro plan (or another host).

## Roadmap

- **Phase 0 – foundation ✅** app, schema, migrations, seed, auth, tenancy, proxy.
- **Phase 1 – booking flow ✅** availability engine, booking wizard, guest booking with
  race-safe creation, confirmation + owner emails (Resend), manage/cancel link, test suite + CI.
  Not yet: rescheduling (cancel + rebook for now), German translations.
- **Phase 2 – admin:** day/week calendar, manual & walk-in bookings, CRUD for
  services/staff/hours/time off, mark completed / no-show.
- **Phase 3 – launch polish:** reminder emails (daily cron), new-booking notifications,
  PWA, Impressum + privacy policy, connect the custom domain.
