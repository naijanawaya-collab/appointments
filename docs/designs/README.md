# Handoff: Appointments — themed storefronts, booking flow, manage page, email, landing

> **Start here.** This folder is the single source of truth. Read this file top to bottom, then `SCREENS.md` (what to build + acceptance criteria per screen), `MOTION.md` (every animation, with code), `BEHAVIOUR.md` (state, data, edge cases) and `TEST-PLAN.md` (how to prove it's done). Everything you need is in this folder; you should not need to ask questions. If two sources disagree, use this order: **SCREENS.md acceptance criteria → prototype HTML → screenshots**.

Repo: `naijanawaya-collab/appointments` (branch `main`, Next.js App Router, `src/app`, `src/components/storefront`, `src/components/booking`, `src/components/manage`, `src/domain/notifications/booking-emails.ts`, `src/lib/format.ts`, `src/db/seed.ts`, `src/app/globals.css`).

---

## 1. What you are building

A multi-tenant booking product for barbershops and beauty salons (Vienna, EUR, Europe/Vienna time):

1. **Storefront** (`/[shop]`): a shop's public page. One component, styled per shop by CSS variables (theme preset + owner colours), in light, dark or auto mode.
2. **Booking flow** (`/[shop]/book`): 5 steps (Services → Professional → Time → Details → Confirmation) with loading, empty, error, slot-taken and validation states.
3. **Manage booking** (`/[shop]/b/[token]`): guest page to view, add to calendar, or cancel (with a deadline).
4. **Confirmation email** (`booking-emails.ts`), per-shop branded, works with images off.
5. **Platform landing** (`/`).
6. **Owner side**: storefront editor, sign-in and dashboard. **Phase 2.** Build only if the task explicitly includes it; screens and notes are provided (SCREENS.md §6–7).

## 2. Fidelity

**High-fidelity.** Colours, type, spacing, radii, motion and copy are final. Recreate pixel-for-pixel using the repo's patterns (React Server Components + client components where interaction is needed). The HTML files in `prototype/` are **design references**, not production code: do not ship them. They use inline styles and a tiny runtime (`support.js`); your implementation should use the repo's styling approach (CSS modules / global CSS with the tokens in `tokens/tokens.css`).

## 3. Folder contents

| Path | What it is |
| --- | --- |
| `README.md` | This file: overview, setup, build order, definition of done |
| `SCREENS.md` | Every screen, with mobile + desktop screenshots, layout spec and **acceptance criteria** |
| `MOTION.md` | Every animation: trigger, duration, easing, and the exact code to implement it |
| `BEHAVIOUR.md` | State machines, data model, API contracts, validation rules, edge cases, copy |
| `TEST-PLAN.md` | Viewports, Playwright test list mapped to acceptance-criteria IDs, a11y + perf budgets |
| `tokens/tokens.css` | **Drop-in** CSS variables for all themes (light/dark/auto), type scale, space scale, motion |
| `tokens/themes.json` | Same tokens as JSON (for server rendering / seeding) |
| `tokens/seed-shops.json` | The 3 demo shops: content, services, staff, hours, photos (use for `src/db/seed.ts`) |
| `code/motion.css` | Production-ready CSS for every animation |
| `code/motion-hooks.ts` | React hooks: scroll reveal, scroll effects (header/bar/parallax), carousel, step transition, lightbox keys, pop-in |
| `code/HeroCarousel.tsx` | Reference carousel component |
| `code/theme.ts` | Server-side theme resolution (no flash) + accent derivation rule |
| `code/booking-utils.ts` | EUR/duration formatting, open-now, cancel deadline, .ics, link builders |
| `screens/*.jpg` | Full-page screenshots of every screen and state (mobile 390 px, desktop 1280 px, light + dark) |
| `prototype/*.dc.html` | Working HTML prototypes. Open directly in a browser (keep `shops.js` + `support.js` next to them) |

### Opening the prototypes
Serve the folder (`npx serve prototype`) and open:
- `Storefront.dc.html?shop=kaiser|fadelab|lune`: resize the window to see mobile ↔ desktop (switch at 900 px).
- `Booking.dc.html?shop=…`: fully clickable; desktop layout at ≥ 960 px.
- `Manage Booking.dc.html?shop=…`: click "Cancel booking" for the two-step flow.
- `Landing.dc.html`, `Booking Email.dc.html`, `Design System.dc.html`.
- `Storefronts & Booking.dc.html` and `Editor, Landing & Admin.dc.html`: boards with every screen side by side.

Each prototype follows the OS light/dark setting via the shop's default mode; the boards pin explicit modes.

## 4. Stack decisions (already made, do not re-decide)

- **Framework:** existing Next.js App Router. Storefront and Manage are Server Components; interactive parts (`Header`, `HeroCarousel`, `Gallery/Lightbox`, `BookBar`, entire `BookingFlow`) are Client Components.
- **Styling:** `tokens/tokens.css` imported in `src/app/globals.css`; components use the variables only. No Tailwind colour classes for themed surfaces. Container queries (`container-type: inline-size`) on the storefront root, booking root and landing root.
- **Icons:** `lucide-react` (ISC). Names listed in BEHAVIOUR.md §8. Size 16–22 px, `strokeWidth` default (2), colour `currentColor`.
- **Fonts:** `next/font/google`: Geist, Geist Mono, Cormorant Garamond (500, 600), Barlow Condensed (600, 700), Italiana (400), Instrument Serif (400), Anton (400). Only load the display font for the active preset on storefront routes (`display: swap`, preload).
- **Images:** `next/image` with `sizes` set; Unsplash demo photos via `images.unsplash.com` (add to `remotePatterns`). Owner uploads served as AVIF/WebP at 480/800/1200/1800 widths with `object-position` = owner focal point.
- **Animation:** CSS + Web Animations API + IntersectionObserver. **No Framer Motion / GSAP** (bundle size; all motions are simple).
- **Map:** OpenStreetMap iframe embed (no API key), `loading="lazy"`.
- **Dates/time:** all calculations in `Europe/Vienna` (`Intl` with `timeZone`), stored as UTC.

## 5. Build order (each step is shippable)

1. **Tokens + theming.** Import `tokens.css`; implement `themeAttributes()` from `code/theme.ts` in the storefront layout. AC: SCREENS.md T-1…T-6.
2. **Storefront static layout** for all 3 demo shops (mobile + desktop) with real photos and icons. AC: S-1…S-40.
3. **Storefront motion + interactions** (`code/motion.css`, `code/motion-hooks.ts`, `HeroCarousel`). AC: M-1…M-14.
4. **Booking flow** (all steps + states). AC: B-1…B-45.
5. **Manage page + email.** AC: G-1…G-14, E-1…E-10.
6. **Landing.** AC: L-1…L-10.
7. Run `TEST-PLAN.md` in full; every AC must pass in light and dark at 360, 390, 768, 1280 and 1440 px.

## 6. Definition of done

- Every acceptance criterion in SCREENS.md passes (Playwright + manual checklist in TEST-PLAN.md).
- Visual match against `screens/*.jpg` at 390 px and 1280 px (≤ 2 px drift in spacing, identical colours, fonts and copy).
- Lighthouse mobile (storefront, Moto G Power, 4G): Performance ≥ 90, Accessibility 100, CLS < 0.02, LCP < 2.5 s.
- `prefers-reduced-motion: reduce` disables all motion (no autoplay, no parallax, no reveals).
- No hard-coded colours in themed components (grep for `#` in storefront/booking/manage CSS must only hit tokens.css).
- axe-core: 0 violations on every screen and state, in both modes.

## 7. Known prototype shortcuts (implement properly, as described)

| Prototype does | Production must |
| --- | --- |
| "Open now · until 19:00" is static text | Compute with `openStatus()` server-side; show "Closed · opens Tue 09:00" when closed (dot grey, no pulse) |
| "Next free: today 15:30" in mobile book bar is static | Server returns next free slot for "any professional" over the next 14 days; hide the line if none |
| Announcement dismissal resets on reload | Persist in `localStorage` key `ann:<shopId>:<announcementId>` |
| Reviews "4.9 · 212 reviews" static | From shop settings (manual entry). Hide the row if empty |
| Date strip shows 12 days | today + 60 days, horizontally scrollable, snap |
| Booking slots are hard-coded | `GET /api/shops/:id/availability` (BEHAVIOUR.md §3) |
| Hero `<img>` is `loading="lazy"` (prototype-runtime quirk) | Use `next/image` with `priority` (eager, `fetchpriority="high"`) for the first hero image |
| Map shows a placeholder in screenshots | Live OSM iframe (works in the prototype in a browser) |
| Dark mode in screenshots is pinned per frame | Owner mode `light / dark / auto`; `auto` follows `prefers-color-scheme` |
