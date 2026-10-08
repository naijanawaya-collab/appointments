# Appointments

Online booking for barbershops and salons. **One app, many shops**: each shop gets
a themed storefront (its own look, photos, sections) on the platform or on its own
domain, a booking flow customers already know, and an admin to run it all.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM +
PostgreSQL (Docker locally, Neon in production) · Better Auth · TanStack Query ·
React Hook Form · Zod · Resend · Cloudinary · Vitest · Playwright · pnpm

**Deploying?** → [`docs/SETUP.md`](docs/SETUP.md), the complete step-by-step guide.

---

## Quick start (local)

Prerequisites: **Node 22** (`.nvmrc`), **pnpm** (`corepack enable`), **Docker Desktop**.

```bash
pnpm install
cp .env.example .env.local      # set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:setup                   # Postgres in Docker + migrations + demo shops
pnpm dev
```

| URL | What you'll see |
| --- | --- |
| http://localhost:3000 | Platform landing page |
| http://localhost:3000/kaiser, `/fadelab`, `/lune` | Demo storefronts (three presets) |
| http://kaiser.localhost:3000 | The same shop as if on its **own domain** |
| http://localhost:3000/kaiser/book | Booking flow |
| http://localhost:3000/login | Sign in (`admin@example.com` / `change-me-please`, an operator) |
| http://localhost:3000/admin/kaiser/storefront | Storefront editor |
| http://localhost:3000/admin/shops | Operator console: create shops, invite owners |

Photo uploads need the Cloudinary variables in `.env.local`; without them,
everything else works.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm lint` / `typecheck` | ESLint + colour-token check / TypeScript |
| `pnpm test` | Unit + component tests (fast, no database) |
| `pnpm test:integration` | Domain logic against real Postgres |
| `pnpm test:e2e` | Playwright on a production build, desktop + phone |
| `pnpm test:all` | Everything |
| `pnpm db:up` / `db:down` / `db:reset` | Local Postgres container |
| `pnpm db:generate --name <change>` | New migration from schema changes |
| `pnpm db:migrate` | Apply migrations (`DATABASE_URL_UNPOOLED` if set, else `DATABASE_URL`) |
| `pnpm db:seed` | Local demo data + admin (re-runnable) |
| `pnpm db:seed:prod` | Production: operator account + demo shops (see docs/SETUP.md) |
| `pnpm vercel-build` | What Vercel runs: migrate, then build |

## What's in the box

**Customers**
- Themed storefront per shop: 6 presets, any accent colour (always kept readable),
  light/dark/auto, display font, logo, 4 hero layouts, sections in the owner's order,
  gallery + lightbox, team, services, reviews, hours + holiday notice, map, contact.
- Booking: services → professional → time (shop's timezone, DST-safe) → details →
  confirmation with calendar file. Guest booking, no account. Double booking is
  impossible at the database level.
- Emails branded per shop, with a link to view or cancel (deadline set by the shop).

**Shop owners** (`/admin/<shop>`)
- Today dashboard, bookings (cancel, completed, no-show, walk-ins), services and
  categories, team (photos, skills, working hours, time off), opening hours and
  closures, settings, reviews, people with access.
- **Storefront editor** with a live preview (phone/desktop), contrast warnings with a
  one-click fix, drag-and-drop sections, photo library (upload, focal point, alt text),
  draft → publish.
- **Custom domain**: add `shop.com` + `www`, see DNS status, set the primary address.

**Operators** (`PLATFORM_ADMIN_EMAILS`): create shops, invite owners, take shops
offline, act for any shop.

## Project structure

```
drizzle/                 SQL migrations (0001 = no-double-booking constraint)
docs/                    SETUP.md (deploy guide), MVP-PLAN.md, designs/ (design handover)
e2e/                     Playwright specs (+ fake Cloudinary for upload tests)
src/
  proxy.ts               Per-request CSP nonce; custom domain → /<hostname>/…;
                         sign-in paths → the app host
  instrumentation.ts     Env check at boot, structured error logging
  app/
    page.tsx             Landing          (platform)/impressum, privacy
    (auth)/              Sign in, forgot / reset password, invites
    [site]/              A shop: storefront, book, b/[token] (manage), legal,
                         opengraph-image. [site] is a slug (/kaiser) or, after
                         the proxy rewrite, a hostname (mbacutzhairstudio.com)
    admin/               Shop admin, storefront editor, operator console
    api/                 Public booking API, auth, preview (draft mode), health
    robots.ts sitemap.ts Per host
  components/            storefront/, booking/, manage/, admin/ (+ editor/), ui/, site/
  domain/                Business logic, no React: theme engine, availability,
                         booking, storefront config, media, domains, access, …
  db/                    Drizzle schema, client, seeds
  lib/                   auth, authz, csp, env, email, rate limit, hosts, motion, …
  styles/                tokens, motion, components, storefront, booking, admin, editor, landing
tests/support/           Test databases and fixtures
```

## How it fits together

```
request ─► proxy.ts
            ├─ platform host (yourdomain.com, app.…, *.vercel.app)
            │    /, /login, /admin/…, /kaiser, /kaiser/book …
            └─ any other host (mbacutzhairstudio.com)
                 rewrite → /mbacutzhairstudio.com/…   (URL bar unchanged)

src/app/[site] ─► resolveSite(): slug or hostname → the shop
               ─► theme rendered on the server (no flash), published config
                  from cache; owners see the draft in the editor preview
```

- Every tenant table has `business_id`; every query filters by it; every admin
  action calls `authorize(businessId, role)`.
- Storefront look = one validated JSON document per shop (`storefront_configs`:
  draft + published).
- Theme engine (`src/domain/theme`): preset + accent + mode → full palette with WCAG AA
  contrast guaranteed; golden-tested against the designer's palettes.
- Photos go straight from the browser to Cloudinary with a signature from our server,
  which verifies Cloudinary's signed response before saving.

## Security

Nonce-based CSP per request · same-origin checks + rate limits on public APIs ·
Zod everywhere · tenant guards on every query and action · hashed manage and
invite tokens · `noindex` + `no-referrer` on token pages · HSTS, nosniff,
frame-ancestors self · signed, tenant-scoped uploads · env validated at boot.

## Testing

Every change ships with tests at the right layer; CI runs all of them on every push.

| Layer | Where | Covers |
| --- | --- | --- |
| Unit | `src/**/*.test.ts` | Theme maths (incl. 500-colour property test), slots, DST, tokens, validation, CSP, env, sitemap, editor state |
| Component | `src/**/*.test.tsx` | Booking steps, editor (incl. axe), admin forms, manage page |
| Integration | `src/**/*.int.test.ts` | Real Postgres: booking races, authorization matrix, tenant isolation, storefront draft/publish |
| E2E | `e2e/*.spec.ts` | Storefront, booking, manage, custom domains, admin journey, editor, landing, security, axe on every screen |
| Lighthouse | CI job, `lighthouserc.json` | Accessibility 100 and SEO 95 gates, layout-shift cap, speed reported |

## Status

MVP complete: [docs/MVP-PLAN.md](docs/MVP-PLAN.md) (M0–M6). Next candidates:
reminder emails, rescheduling, a full calendar view, German translation, Redis-backed
rate limits.
