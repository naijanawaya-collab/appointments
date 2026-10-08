# MVP action plan: themed storefronts, owner editor, custom domains

> **Goal.** Deploy the platform; create a shop; let its owner customise the storefront
> (look, photos, sections, content), services, team and hours from the admin; and serve
> the shop on its own domain. Everything must be tested and production-ready.
>
> **Inputs.** The design handover in `docs/designs/` (README, SCREENS, BEHAVIOUR,
> MOTION, TEST-PLAN, tokens, reference code, prototypes, screenshots) plus Phases 0–1
> already in `main`.
>
> **How to use this file.** Work top to bottom, one milestone at a time. Each milestone
> is shippable and has its own tests. When this plan and the design handover disagree,
> section 2 ("Decisions") wins; it explains why.

---

## 0. Where we are (updated 8 Oct 2026)

**All milestones M0–M6 are built and tested. The MVP is ready to deploy** as soon as
the accounts in `docs/SETUP.md` exist (domain, Vercel, Neon, Resend, Cloudinary).

| Milestone | Status | Delivered |
| --- | --- | --- |
| M0 Staging infrastructure | ✅ Code done, accounts pending | Env check at boot, `vercel.json`, migrations in `vercel-build`, `/api/health`, production seed, `docs/SETUP.md` |
| M1 Foundations | ✅ Done | Theme engine (AA-safe accents), storefront config, Cloudinary signed uploads, tokens |
| M2 Storefront | ✅ Done | 6 presets, hero layouts, sections, gallery, motion, open status, closures |
| M3 Booking, manage, email | ✅ Done | Redesigned wizard, manage/cancel page, branded emails, `.ics` |
| M4 Admin + operator + domains | ✅ Done | Services, team, hours, bookings, settings, people, operator console, custom domains |
| M5 Storefront editor | ✅ Done | Live preview, contrast fix, drag-and-drop sections, photo library, draft → publish |
| M6 Landing, hardening | ✅ Done | Landing, Impressum/privacy, nonce CSP, robots/sitemap per host, Lighthouse CI gates |

Tests: ~250 unit/component, ~85 integration, e2e on desktop + phone (booking, custom
domains, admin, editor, landing, security, axe on every screen), Lighthouse in CI.

**Next:** follow `docs/SETUP.md`, then set up Mba Cutz Hair Studio and cut over the domain.

---

## 1. MVP scope

**In scope**
1. Themed public storefront per shop: 6 presets, owner accent, light/dark/auto mode, logo,
   4 hero layouts, sections (reorder + toggle), gallery + lightbox, team, services,
   reviews, hours + holiday notice, map, contact, footer, motion.
2. Booking flow, manage page and confirmation/cancellation emails, built to the design,
   including `.ics` calendar files.
3. Owner admin: sign-in, forgot password, dashboard (today's bookings and simple stats),
   bookings list (view / cancel / mark no-show), services, team (photos, skills, hours),
   opening hours + closures, shop details, **storefront editor** with live preview and
   publish, **custom domain** management.
4. Platform operator (you): create a shop and invite its owner.
5. Platform landing page.
6. Deployment on Vercel + Neon + Resend + Cloudinary with CI and migrations.

**Out of scope (later)**
- Self-serve sign-up and billing.
- Customer accounts.
- Rescheduling (cancel + rebook for now).
- SMS/WhatsApp notifications and reminder emails (cron).
- The full calendar day-timeline (MVP gets a simple list version).
- German translation (layout stays German-ready).
- Analytics dashboards (events are emitted, §3.6).

---

## 2. Decisions and deviations from the handover

The handover's README says "Stack decisions already made, do not re-decide". The
items below either fit our existing codebase better or close gaps in the handover.
Everything visual (colours, type, spacing, copy, motion) stays exactly as designed.

| # | Handover says | We do | Why |
| --- | --- | --- | --- |
| D1 | Routes `/[shop]`, `/[shop]/book`, `/[shop]/b/[token]` | **Adopt.** One route tree `src/app/[site]/…` serves both platform slugs and custom domains (§3.1). Old `/book/[slug]` and `/manage/[token]` permanently redirect, so links in emails already sent keep working. | Matches the design, removes the duplicated `/sites/[host]` tree. |
| D2 | API `/api/shops/...`, `POST /api/bookings` | Keep `/api/businesses/:id/...`. Add the missing endpoints (`days`, next available, idempotency, cancel by token). | Renaming would churn working, tested code for no user-visible gain. Response shapes follow BEHAVIOUR §3. |
| D3 | "CSS modules / global CSS, no Tailwind colour classes" | Keep **Tailwind v4**, with every themed colour mapped to the CSS variables (`bg-accent`, `text-accent-text` …). Design's `motion.css` and component classes live in global CSS layers. Container queries via Tailwind `@container`. | Same result (all colours come from tokens), no second styling system. A lint check bans raw hex colours outside `tokens.css`. |
| D4 | `next/font/google` | **`next/font/local` with self-hosted WOFF2** (from `@fontsource` packages). | Builds don't depend on Google (they already failed once in our CI-like sandbox); exact control over subsets and which font is preloaded. Design's own Design System §05 also asks for self-hosted WOFF2. |
| D5 | Themes are 3 hand-tuned palettes (kaiser/fadelab/lune) + platform | **Theme engine (§3.3):** preset (6) + owner accent + mode → full palette computed on the server with the contrast rules from Design System §04. The 3 demo palettes become preset defaults and must reproduce the designed values exactly (unit-tested). | Required for "any owner colour". |
| D6 | Booking status `confirmed / cancelled / completed` | Keep our statuses (`pending, confirmed, cancelled, completed, no_show`). "Completed" on the manage page is derived (start time has passed and status is confirmed). | No cron job needed; `no_show` is useful for the owner. |
| D7 | Any professional → server picks "least booked that day" | **Adopt** (today we pick by sort order). | Better load balancing. |
| D8 | Animation: CSS + WAAPI, no Framer Motion | **Adopt** as designed (`code/motion.css`, `code/motion-hooks.ts`). | Smallest bundle. |
| D9 | Visual regression against `screens/*.jpg` at ≤ 2 px | Compare by eye against the JPGs at sign-off. Playwright `toHaveScreenshot` baselines are recorded from our own build once approved. | The JPGs come from the prototype runtime, so pixel-diffing them against a real build is noise. |
| D10 | Owner uploads served at 480/800/1200/1800 widths | **Cloudinary** (`f_auto,q_auto,c_limit,w_<n>`) through a `next/image` loader. The focal point uses CSS `object-position`, so one upload serves every crop. | Your choice of host; no Vercel image-optimisation cost. |
| D11 | Editor = Phase 2 | **In MVP** (M5), as you asked. Admin dashboard = simple version of the design's direction. | Owners must customise without us. |
| D12 | `X-Frame-Options: DENY` (current code) | Change to `frame-ancestors 'self'` via CSP. | The editor's live preview is an iframe of the storefront. |
| D13 | "Open your storefront" → sign-up | MVP: a "Request access" form/mailto. You create shops in the operator admin. | Self-serve sign-up and billing are out of scope. |

---

## 3. Architecture

### 3.1 Routing and tenancy

```
Request
  ├─ proxy.ts (never touches the DB)
  │    platform host + path starting with a dotted segment → 404   (blocks /brosbab.com on the platform)
  │    custom host (brosbab.com)  →  rewrite to /brosbab.com/<path>
  │    platform host              →  pass through
  │
  └─ src/app/[site]/…   one tree for both
       [site] has no dot → it's a slug ("kaiser")         → basePath "/kaiser"
       [site] has a dot  → it's a hostname ("brosbab.com") → basePath ""  (must equal the Host header)
```

- `resolveSite(param, requestHost)` in `src/domain/business/resolve-site.ts` returns
  `{ business, basePath, isCustomDomain }`. Every storefront page receives it and builds
  links with `href(basePath, "/book")`, so the same components work on both URLs.
- **Reserved slugs** (validated on shop creation): `admin, login, api, book, manage, b,
  sites, _next, static, assets, fonts, favicon.ico, robots.txt, sitemap.xml, og, preview`.
  Static routes already win over `[site]` in Next.js; the list stops a shop from taking a
  name that clashes.
- Routes:
  - `[site]/page.tsx`: storefront.
  - `[site]/book/page.tsx`: booking (`?step=&service=&staff=`).
  - `[site]/b/[token]/page.tsx`: manage booking.
  - `[site]/opengraph-image.tsx`: generated share image.
  - `[site]/not-found.tsx`: G-6 "This link isn't valid anymore".
- Platform-only routes: `/`, `/login`, `/forgot-password`, `/reset-password`, `/admin/**`,
  `/api/**`. The proxy returns 404 for `/admin` and `/login` on custom domains (already
  done and tested).
- Redirects: `/book/[slug]` → `/[slug]/book`; `/manage/[token]` → `/[shop-slug]/b/[token]`
  (308).

### 3.2 Data model changes (M1 migrations)

| Change | Purpose |
| --- | --- |
| `businesses` + `short_name`, `mark` (monogram letter), `eyebrow`, `tagline`, `about`, `lat`, `lon`, `instagram`, `tiktok`, `whatsapp`, `rating_value`, `rating_count` | Storefront content (BEHAVIOUR §1) |
| `businesses.cancellation_window_hours` | Already exists (= design's `cancelLeadHours`) |
| **`storefront_configs`** (`business_id` PK, `draft jsonb`, `published jsonb`, `published_at`, `updated_at`, `updated_by`) | Everything presentational in **one Zod-validated document**: `{ preset, mode, accent, secondary?, displayFont?, logoMediaId?, hero: { layout, mediaIds[] }, aboutMediaId?, sections: [{ key, visible }], announcement?: { id, tag, text, until? }, serviceImages, seo: { title, description } }`. Draft/publish is just copying `draft` → `published`. |
| **`media`** (`id, business_id, provider ('cloudinary'\|'external'), public_id/url, width, height, bytes, format, alt, focal_x, focal_y, kind ('hero'\|'gallery'\|'about'\|'logo'\|'staff'\|'service'), position, created_at`) | Every image, scoped per business. Gallery = `kind='gallery'` ordered by `position`. |
| `staff.photo_media_id`, `services.image_media_id` | Replaces free-text URL columns |
| **`service_categories`** (`id, business_id, name, position`) + `services.category_id` | Ordered categories for chips and section grouping (replaces the text `category` column) |
| **`opening_hours`** (`business_id, weekday, start_time, end_time`) | Shop hours for "Open now", the hours table and closed days. New staff default to these hours. |
| **`closures`** (`business_id, starts_on, ends_on, label`) | Holiday closures: block availability, mark days closed in the date strip, drive the holiday notice (S-20) |
| **`reviews`** (`id, business_id, quote, author, source, position`) | Manually entered reviews (S-14) |
| `bookings.idempotency_key` + unique (`business_id`, `idempotency_key`) | B-18: double submit returns the same booking |
| `members.role` add `'platform_admin'`? **No.** Use env `PLATFORM_ADMIN_EMAILS` | Operator access without a schema-level super-role |
| `business_domains` + `verified_at`, `vercel_status` | Domain status in the admin (M4) |

Seed: rewrite `src/db/seed.ts` to load `docs/designs/tokens/seed-shops.json` (Kaiser,
FADE/LAB, Lune, with services, staff, hours, Unsplash media as `provider='external'`),
plus the "stress shop" from TEST-PLAN. Keep `demo-barber` as an alias of Kaiser for
existing tests, or migrate those tests.

### 3.3 Theme engine (`src/domain/theme/`, pure and fully unit-tested)

```
presets.ts      6 presets: editorial (platform), classic, modern, minimal, bold, soft
                each = { typography: font, weight, transform, tracking; shape: radius, radius-lg, btn-radius,
                         btn-transform; neutrals: light{bg,fg,surface,muted,line}, dark{…};
                         defaultAccent, defaultMode, defaultHero, motion: calm|standard|lively }
color.ts        hex ↔ OKLCH, WCAG 2.1 relative luminance + contrast ratio (~80 lines, no dependency)
derive.ts       deriveTokens(preset, accent, mode) → full token set:
                  --accent-foreground = black or white, whichever contrasts more
                  --accent-text       = accent stepped in OKLCH L by .02 until ≥ 4.5:1 on --background (max 40 steps)
                  --accent-hover/-pressed = L ∓ .06 / ∓ .12 (dark: + .06 / + .10)
                  --accent-subtle     = 12% accent mixed into background
                  needsFix = |ΔL| > .15 → editor warning + "Fix it" (ED-2)
render.ts       themeStyle(config) → { attrs: data-theme/data-mode, css: one <style> block with light,
                dark and auto (@media prefers-color-scheme) rules, colorScheme, themeColor }
fonts.ts        curated display fonts → next/font/local instances; only the active one is applied and preloaded
```

- Values are computed on the server as plain hex (no `oklch(from …)` at runtime), so
  every browser and the email template get identical colours.
- **Golden tests:** classic + `#8a6a2f` reproduces Kaiser's designed palette exactly,
  modern + `#ff5a1f` reproduces FADE/LAB's, soft + `#a3456b` reproduces Lune's,
  editorial reproduces the platform's (light + dark).
- **Property test:** 500 random accents × 6 presets × 2 modes. Every pair listed in
  TEST-PLAN "Contrast script" is ≥ 4.5:1.
- `tokens.css` keeps only the static tokens (type, space, layout, motion, reduced
  motion). Per-shop colours always come from the server `<style>`, which gives T-1/T-2:
  correct theme on first paint, no flash.

### 3.4 Media pipeline (Cloudinary)

```
Admin (browser)                         Our server                         Cloudinary
  pick file → validate type/size  ──►  POST /api/admin/media/sign
  (≤10 MB, jpeg/png/webp/heic)          assertMember(user, business)
                                        signs {folder: tenants/<businessId>, allowed_formats,
                                               timestamp} with API secret ─────────────────┐
  upload direct to Cloudinary  ◄────────────────────────────────────────────────────────────┘
  (progress bar, no server bandwidth) ─────────────────────────────────────────────────────►  stores
  POST /api/admin/media { public_id, version, signature, … }
                                        verify response signature + folder prefix = tenant
                                        insert media row (w, h, bytes, format, alt, focal)
```

- Delivery: `cloudinaryLoader({ src, width })` →
  `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,c_limit,w_<width>/<public_id>`.
  Hero uses `priority` (S-8); everything else is lazy with a fixed `aspect-ratio`
  (S-23, CLS 0). External (Unsplash seed) URLs go through the same loader by rewriting
  `w=`.
- Focal point = `object-position: x% y%` set from the stored focal point.
- Quality hints in the editor (ED-4): "looks soft as a hero" when width < 1600 px.
  "Too large" is checked before upload.
- Deleting media: remove the row, then call the Cloudinary destroy API in `after()`.
- Credentials are server-only (`CLOUDINARY_API_SECRET`). The browser only ever gets
  short-lived signatures for its own tenant folder.

### 3.5 Performance and caching

- **Storefront data cache:** published config + catalog + media are cached with tags
  (`business:<id>`), using Next 16's `"use cache"` + `cacheTag` (enable
  `cacheComponents` in M2 after reading `node_modules/next/dist/docs`). Publishing and
  admin edits call `updateTag`/`revalidateTag`. Result: storefronts served from cache,
  so the database isn't hit per visitor.
- Time-dependent bits ("Open now", "Next free: today 15:30") render in small Suspense
  islands, so the cached page never shows stale times.
- **JS budget < 70 KB** on the storefront: move the React Query provider out of the root
  layout into `[site]/book` and `admin` layouts. Storefront client components are only
  Header, HeroCarousel, Gallery/Lightbox and BookBar. Icons imported per icon.
- Fonts: one display font preloaded per page, `font-display: swap`, metric-matched
  fallback (no layout shift).
- Lighthouse CI on the 3 demo storefronts (TEST-PLAN budgets) in CI, warning-only until
  M6, then blocking.

### 3.6 Security

- Every admin mutation: `requireSession()` → `assertMember(user, businessId)`, with role
  checks (owner vs staff) in one `authorize(action)` helper, enforced by tests.
- Operator routes check `PLATFORM_ADMIN_EMAILS`.
- Zod on every input (shared schemas in `src/validation/`), same-origin checks
  (Server Actions do this natively), rate limits on public endpoints (existing),
  idempotency on booking.
- Storefront config: user text is rendered as text only (no HTML). URLs (socials) are
  validated against allowed hosts. Colours must be `#rrggbb` (they go into a server
  `<style>`, so strict validation prevents CSS injection).
- **CSP** (M6): `default-src 'self'`; `img-src 'self' res.cloudinary.com
  images.unsplash.com data:`; `frame-src www.openstreetmap.org`;
  `frame-ancestors 'self'`; script nonces via proxy.
- Draft preview: `?preview=1` shows the draft only to signed-in members of that shop
  (checked on the server), and is never cached.
- Custom domains: a hostname is accepted only after the operator/owner adds it. The
  existing tenant guard stops a domain from reading other shops' data.
- Better Auth: password reset by email, session cookie on the platform domain only. Owner
  invites use a single-use, expiring reset link.
- Analytics events (BEHAVIOUR §6) are emitted to a no-op `track()` for now, ready for
  Vercel Analytics or Plausible later. No cookies, so no cookie banner.

### 3.7 Module layout (target)

```
src/
  app/
    [site]/                      storefront, book, b/[token], opengraph-image, not-found
    admin/                       (shell layout with sidebar / mobile tab bar)
      page.tsx                   dashboard
      bookings/  services/  team/  hours/  storefront/  domain/  settings/
      shops/                     operator only: create shop + invite owner
    login/  forgot-password/  reset-password/
    api/
      businesses/[businessId]/   catalog, availability, days, bookings (public)
      admin/media/               sign, create, delete
  components/
    ui/                          Button, IconButton, Field, Pill, Card, Skeleton, Dialog, Sheet, Tabs, Sortable …
    storefront/                  Header, Announcement, Hero{Split,Full,Carousel,Text}, sections/*, Gallery, Lightbox, BookBar, Footer
    booking/                     (rebuilt) Wizard, steps/*, SummaryAside, BottomBar, DateStrip, SlotGrid
    manage/                      ManageBooking, CancelPanel, StatusPill
    admin/                       Shell, forms per entity, MediaPicker, FocalPointPicker, editor/*
  domain/
    theme/                       presets, color, derive, render, fonts        (pure)
    storefront/                  config schema, defaults, load/save/publish
    media/                       cloudinary sign/verify, loader               (server)
    business/ catalog/ availability/ booking/ notifications/ hours/ (open status, closures)
  lib/
    motion/                      motion hooks (from design) + popIn
    links.ts ics.ts format.ts    tel/wa/directions/osm, .ics, € / duration
  styles/
    tokens.css motion.css components.css
```

Rules (also in `AGENTS.md`): domain code is pure or DB-only (no React). UI primitives in
`components/ui` are theme-agnostic and use tokens only. Every new module ships with tests.

---

## 4. Milestones

Every milestone ends with: `pnpm test:all` green, CI green, preview deployed to staging,
and a short demo note.

### M0: Staging infrastructure (can start today, in parallel)

You:
1. Create accounts / projects:
   - **Vercel** (Pro plan, needed for commercial use).
   - **Neon** (Frankfurt region).
   - **Resend**: verify a **sending domain**. Resend can only send to arbitrary
     recipients from a verified domain, so we need one: the platform domain if you buy
     one, or your brother's domain to start.
   - **Cloudinary**: free tier is fine.
2. Share or set the env vars in Vercel (§6).

Me:
1. Add `vercel.json`/build command that runs migrations (`pnpm db:migrate && next build`).
2. Production env checks: the app fails fast at boot if a required env var is missing
   (`src/lib/env.ts`, Zod).
3. Deploy Phase 1 to a staging URL. Smoke test: booking + email + cancel on staging.

Done when: staging URL works end to end with real email.

### M1: Foundations (data, theme engine, media, design tokens)

1. Migrations for §3.2. Update domain queries and types. Existing tests stay green.
2. Theme engine §3.3 with golden + property tests.
3. Fonts via `next/font/local` (6 display fonts + Geist/Geist Mono).
4. Global styles: `tokens.css` (static part), `motion.css`, base component classes.
   Tailwind theme maps every token. Lint rule: no hex colours outside `tokens.css`.
5. Storefront config schema + defaults per preset, `load/saveDraft/publish` with tests.
6. Cloudinary: sign/verify/loader + `media` service. Integration tests with Cloudinary
   mocked at the HTTP boundary.
7. Seed from `seed-shops.json` (+ stress shop).
8. UI primitives in `components/ui` (Button variants per Design System §06, Field, Pill,
   Card, Skeleton, Dialog, Sheet), each with component tests.

Tests: theme golden/property (unit), config schema (unit), media sign/verify
(integration), primitives (component + axe).

### M2: Storefront (SCREENS §1, MOTION M-1…M-10, AC S-1…S-25, T-1…T-10)

1. Routing per §3.1 + redirects + reserved slugs. Update proxy and its tests.
2. Storefront layout with server theming (no flash), container queries, breakpoint 900.
3. Components:
   - Announcement (dismiss persisted in `localStorage`).
   - Sticky header + mobile menu.
   - 4 hero layouts, with fallbacks (carousel needs ≥ 3 photos, otherwise split; no
     photos → text hero).
   - Sections in owner order: About, Services, Team, Gallery + Lightbox, Reviews,
     Hours & location (OSM iframe, directions/tel/WhatsApp), Contact.
   - Footer, mobile BookBar (next free slot from M3 endpoint, hidden if none).
4. Open-status (`openStatus()` with "opens Tue 09:00" scanning forward 7 days) and
   holiday notice (closure within 30 days).
5. Motion hooks from `docs/designs/code/motion-hooks.ts` and the reduced-motion rules.
6. SEO: `<title>`, description, JSON-LD `HairSalon`/`BeautySalon`, OG image
   (`opengraph-image.tsx`: hero + name + accent), `noindex` for draft preview.
7. Caching §3.5 and the storefront JS budget.

Tests:
- e2e `storefront.spec.ts` covering the TEST-PLAN list (S-1…S-24), with a frozen clock
  (`page.clock`) for open status.
- axe on all 3 shops × light/dark.
- Overflow check 320–1920 px.
- Stress shop.
- Unit tests for `openStatus`, closures and section ordering.

### M3: Booking, manage, email (SCREENS §2–4, AC B-1…B-26, G-1…G-7, E-1…E-10)

1. API:
   - `GET days?from&to` (closed days from opening hours + closures).
   - Availability response adds `nextAvailable`.
   - Closures block slots.
   - Idempotency key.
   - "Least booked that day" assignment.
   - Validation copy exactly as BEHAVIOUR §4.
2. Wizard rebuilt to the design:
   - Header with step counter; progress (3 or 4 segments); desktop aside ≥ 960 /
     mobile bottom bar.
   - Category chips with scroll-spy.
   - Skip the staff step when the shop has 1 professional; preselect from
     `?service=`/`?staff=`.
   - 60-day date strip with closed days.
   - Loading after 150 ms; empty state with "Jump to"; error with retry; 409 alert with
     the taken slot struck through.
   - Details with `+43` prefill and validate on blur.
   - Spinner + idempotent submit.
   - Confirmation with pop-in, `.ics` download, "Book another".
   - URL `?step=` synced with browser Back; `sessionStorage` persistence (`bk:<shopId>`).
   - Step transition (M-11) and focus management.
3. Manage page:
   - Status pill (confirmed / cancelled / completed-derived).
   - Add to calendar, Directions.
   - Cancel panel `role="alertdialog"`, too-late state with Call/WhatsApp, server-side
     deadline check (409 → too-late), themed 404.
4. Email: table-based, per-shop accent (using the AA-safe `--accent-text` fallback),
   Georgia/Helvetica, images-off safe, `.ics` attached, subject format E-6, cancellation
   variant E-7, plain-text part. Snapshot tests per shop + contrast assertion.

Tests:
- Component tests for every step/state.
- Integration tests for `days`, closures, idempotency, least-booked.
- e2e `booking.spec.ts` / `manage.spec.ts` per TEST-PLAN (mocked 409/500/empty via
  route interception).
- Unit tests for `.ics` and deadline.
- Keyboard-only booking run.

### M4: Owner admin core + operator + custom domains

1. Auth:
   - Sign-in page to the design (split layout, error copy).
   - Forgot/reset password (Better Auth + Resend).
   - Owner invite = reset link (single use, 24 h).
2. Admin shell: sidebar on desktop, bottom tab bar on mobile; shop switcher if a user
   belongs to more than one shop.
3. **Operator** `/admin/shops`: create shop (name, slug with reserved-slug and
   uniqueness check, preset, owner email) → creates business + storefront config
   defaults + owner member + sends invite.
4. **Dashboard:** today's stats (bookings, booked revenue, free slots, next up) + today
   list per barber (mobile list design; the desktop timeline is a later upgrade).
5. **Bookings:** upcoming/past list with filters, detail drawer, cancel (emails the
   customer), mark completed / no-show (via `assertTransition`), manual "+ Walk-in"
   booking (reuses `createBooking` with `source`).
6. **Services:** categories (reorder), services CRUD (duration, buffer, price, description,
   image, active), staff assignment.
7. **Team:** CRUD, photo, bio, title, services offered, working hours per weekday
   (default = shop hours), time off.
8. **Hours:** opening hours editor + closures (holiday notice).
9. **Shop details:** name, short name, eyebrow, tagline, about, address + geo (lookup
   from address via OSM Nominatim, server-side, cached), phone, email, socials, rating,
   reviews, cancellation window, booking rules (slot interval, lead time, horizon).
10. **Custom domain** `/admin/domain`:
    - Add hostname (validated, normalised, apex + `www`).
    - With `VERCEL_TOKEN` set: add it to the Vercel project via the Domains API, show
      the exact DNS records Vercel asks for, and poll verification
      ("Pending DNS" / "Verifying" / "Live").
    - Without the token: show manual steps.
    - Set primary domain; remove domain.
    - The storefront's canonical URL uses the primary domain.

Tests:
- Integration tests for every admin domain function, including **authorization tests**
  (a member of shop A can't touch shop B; staff can't do owner-only actions).
- Component tests for forms.
- e2e: operator creates shop → owner accepts invite → adds a service and a barber →
  booking appears on the dashboard.
- Domain flow with the Vercel API mocked.

### M5: Storefront editor (SCREENS §6, ED-1…ED-4)

1. Layout: settings panel left (desktop) / bottom sheet (mobile), live preview right with
   a Mobile/Desktop toggle. Header: Dashboard link, "Draft · saved 2 min ago", Reset to
   preset, Preview on my domain, Publish.
2. Steps: Preset → Colours → Font → Logo → Hero → Sections → Content → Publish.
   - **Preset:** 6 cards (Design System §03).
   - **Colours:** mode, accent picker + preset suggestions, contrast warning with
     ratios + "Fix it" / "Keep mine", optional secondary, generated swatches.
   - **Font:** 6 curated with samples.
   - **Logo:** upload or monogram.
   - **Hero:** layout cards (carousel disabled with < 3 photos), photo picker, focal
     point, alt text.
   - **Sections:** dnd-kit sortable with keyboard (Space lift, ↑/↓, Space drop) +
     toggles; Hero first / Book button always on.
   - **Content:** tagline, eyebrow, about, announcement (tag, text, until), service
     images toggle, gallery manager (upload, reorder, alt, focal).
   - **Publish:** generated share image preview, page title (60) / description, Publish
     changes.
3. Live preview: an iframe of `/<slug>?preview=1` (draft, members only). Token-only
   changes are pushed via `postMessage` and applied as CSS variables in ≤ 100 ms (ED-1);
   structural changes autosave the draft (debounced 800 ms) and refresh the iframe.
4. Media dialog: drag-drop / pick, client-side checks (≤ 10 MB, type), progress, quality
   hint, focal-point picker with Square / 4:5 / 16:9 previews, alt text (required to
   publish; fallback "Inside <shop>").
5. Publish: validate (alt texts, carousel ≥ 3 photos), copy draft → published,
   revalidate cache tags.

Tests:
- Unit: config reducer, contrast-fix logic.
- Component: each step, sortable keyboard behaviour, media dialog states.
- Integration: draft/publish, preview authorization.
- e2e: change preset + accent + reorder sections + upload photo (Cloudinary mocked)
  → publish → public storefront reflects it, while a draft change is NOT visible
  publicly before publish.

### M6: Landing, hardening, launch

1. Landing page (SCREENS §5) with real storefront screenshots generated by a Playwright
   script at build/release time.
2. CSP + security headers final (§3.6); `robots.txt`, `sitemap.xml` per site.
3. Lighthouse CI blocking with TEST-PLAN budgets; axe 0 violations on every screen;
   overflow tests 320–1920 px; reduced-motion run.
4. Visual baselines recorded after your sign-off; manual checklist from TEST-PLAN.
5. Impressum + privacy pages per shop (content from shop details) and for the platform.
6. Production: Neon production branch, Vercel production env, Resend production domain,
   backups (Neon PITR), error alerts (Vercel log drains or Sentry free tier).
7. **Go-live runbook** for your brother's shop (§6.3).

---

## 5. Testing strategy

| Layer | Tooling | What's covered |
| --- | --- | --- |
| Unit | Vitest | Theme engine (golden + property), open status, closures, `.ics`, deadlines, config schema, reducers, formatters |
| Component | Vitest + Testing Library + jsdom + `vitest-axe` | Every UI primitive, storefront section, booking step/state, editor step, admin form |
| Integration | Vitest + real Postgres | Every domain function, **authorization matrix**, booking races, idempotency, publish/draft, media verify (Cloudinary mocked) |
| E2E | Playwright (desktop + mobile, light + dark) + `@axe-core/playwright` + `page.clock` | TEST-PLAN spec list, operator → owner → customer journeys, custom-domain flows |
| Performance | Lighthouse CI | TEST-PLAN budgets on the 3 demo storefronts |
| Visual | Playwright `toHaveScreenshot` | Baselines approved by you (D9) |

Rules: tests are written in the same change as the code. CI blocks merges on any red
layer. Flaky tests are fixed, never retried away.

---

## 6. Deployment

### 6.1 Accounts and costs (MVP)
| Service | Plan | Why |
| --- | --- | --- |
| Vercel | Pro (~$20/month) | Commercial use, custom domains, Domains API |
| Neon | Free to start (Frankfurt) | Postgres; upgrade when storage or compute grows |
| Resend | Free (3,000 emails/month, 100/day, 3 domains) | Needs one verified sending domain |
| Cloudinary | Free tier | Image storage + delivery |
| Domains | Your brother's domain (he owns it); optional platform domain | Storefront and email sending |

### 6.2 Environment variables
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `PLATFORM_HOSTS`,
`PLATFORM_ADMIN_EMAILS`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_PLATFORM_URL`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`
(+ `VERCEL_TEAM_ID`) for domain automation, optional `RATE_LIMIT_*`. All validated at
boot by `src/lib/env.ts`.

### 6.3 Go-live runbook (your brother's shop)
1. Operator admin → Create shop (slug, preset, owner email) → owner gets the invite.
2. Owner (or you) adds services, team, hours, closures, photos; customises the storefront
   in the editor; publishes.
3. Admin → Domain → add `mbacutzhairstudio.com` + `www.mbacutzhairstudio.com` → set the DNS records shown at
   his registrar → wait for "Live" (SSL is automatic).
4. Test booking on the real domain from a phone; check the email arrives and the cancel
   link works.
5. Share the link (Instagram bio, Google Business profile).

### 6.4 Known MVP limits (documented, accepted)
- Rate limiting is per server instance (in-memory). Move to Upstash Redis when traffic
  warrants it.
- No reminder emails or rescheduling yet.
- The admin dashboard is a list, not the full timeline.

---

## 7. Decisions (answered 8 Oct 2026)

1. **Platform domain:** buying one (name TBD). Layout:
   - `<domain>` = landing page.
   - `app.<domain>` = admin + sign-in (Better Auth cookie scoped here).
   - `mail.<domain>` = Resend sending subdomain (SPF/DKIM/DMARC records only).
2. **Email sender:** platform domain by default, branded per shop:
   `From: "<Shop short name>" <bookings@mail.<domain>>`, `Reply-To: <shop email>`.
   Customers see the shop's name, and replies go to the shop. Optional per-shop sending
   domain (e.g. `mail.mbacutzhairstudio.com`) is a later feature. The free plan allows
   3 domains, so this fits before upgrading.
3. **Demo shops:** Kaiser, FADE/LAB and Lune stay live in production as examples until
   removed.
4. **First real shop:** Mba Cutz Hair Studio, domain `mbacutzhairstudio.com` (already
   owned, currently hosting an old booking site). At cutover, change only the
   website records (A/CNAME for apex + `www`) to Vercel. **Keep MX/TXT email records
   untouched** so his email keeps working. Import services/prices/photos from the old
   site during M4.
