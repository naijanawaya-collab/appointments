# Design prompt (for Claude Design)

Paste everything below the line into Claude Design. It describes the product,
the screens that already exist in code, how far each shop can customise its
storefront, and hard constraints (performance, accessibility, multi-tenant
theming) so the design can be implemented without rework.

---

Design a sleek, modern booking experience for an online appointment platform for barbershops. One codebase serves many shops; the first is a newly opened barbershop. Customers book on their phone in under a minute; the owner manages everything from a dashboard.

The most important idea: **every shop's storefront must feel like its own brand, not a template.** Two shops on the platform should look clearly different, through their photos, colours, type and layout, while the booking flow stays familiar, fast and accessible.

**Platform brand direction (the default look and the platform's own pages)**
- Mood: confident, crafted, calm. Think premium barbershop: warm neutrals (stone, bone, charcoal), one strong accent, generous whitespace, editorial typography. Not "SaaS blue", no gradients-everywhere, no stock-photo clutter.
- Typography: Geist Sans for UI (already installed). Tabular numbers for prices and times.
- Express everything as design tokens. The code already uses these CSS variables, so keep the names: `--background`, `--foreground`, `--surface`, `--muted`, `--line`, `--accent`, `--accent-foreground`, `--danger`. Provide light **and** dark values.

**Storefront customisation (design the system, not just one shop)**
Each shop owner can customise the following. Design how each option looks and how it degrades when it's missing:

- **Theme presets**: 4–6 curated starting looks, for example "Classic" (warm cream, serif display, brass accent), "Modern" (charcoal, condensed grotesk, bold accent), "Minimal" (white, lots of space, monochrome) and "Bold" (dark, high-contrast, large photography). The owner picks a preset first, then adjusts it.
- **Colours**: a primary/accent colour plus an optional secondary colour, and light, dark or auto mode. Derive every other token (hover, pressed, subtle tints, `--accent-foreground`) from these automatically. Show the rule that keeps text and buttons at WCAG AA no matter which colour the owner picks: auto-switch the text to black or white, and darken or lighten the accent when needed.
- **Typography**: choose one display font from a curated set of about 6 pairings that work with Geist for body text. No arbitrary font uploads.
- **Logo**: wordmark or icon, on light and dark backgrounds, plus a favicon. Fallback: the shop name set in the display font.
- **Hero**: pick from 3–4 hero layouts: full-bleed photo with overlay text, split (photo + text), photo carousel of up to 5 images, and text-only with a pattern or texture. Images need a focal point so crops look right on mobile and desktop.
- **Imagery throughout**: a photo gallery (interior, work, before/after), staff photos and short bios, optional service images, and an "about the shop" image. Design good-looking empty and partial states for shops that have only 1–2 photos, which is the reality of a new shop.
- **Sections**: the owner can turn sections on or off and reorder them: About, Services & prices, Team, Gallery, Reviews/testimonials, Opening hours, Location & map, Contact & socials (Instagram, TikTok, WhatsApp, Google Maps link). Booking is always reachable through a persistent "Book now" button.
- **Content**: tagline, about text, opening hours and holiday notices, an announcement banner (e.g. "Closed 24–26 Dec", "New: beard packages"), address, phone and social links.
- **Sharing/SEO**: a social share image (Open Graph) generated from the hero, logo and colours, plus page title and description.

Show the same storefront structure as **3 contrasting example shops**: (a) a classic gentleman's barbershop, (b) a modern fade studio, (c) a beauty or nail salon. The point is to prove the system's range. The booking flow inside each shop picks up that shop's colours, font and imagery but keeps the same layout and interactions.

**Storefront editor (owner side)**
Design the admin screen where the owner customises the storefront:
- Settings panel on the left (desktop) or as a bottom sheet (mobile), and a **live preview** that switches between mobile and desktop.
- Steps: choose a preset → colours → font → logo → hero → sections (drag to reorder, toggle) → content → publish.
- Image upload with crop, focal point and alt-text fields. Show upload progress, an "image too large" error, and a "needs a better image" hint.
- A contrast warning when a chosen colour would hurt readability, with a one-click "fix it" suggestion.
- "Preview on my domain" and "Publish" actions, plus "Reset to preset".

**Screens to design (mobile 390px first, then desktop 1280px)**
1. **Shop storefront / booking page**: themed per the customisation system above; hero, sections and a strong "Book now" call to action, with the booking flow below or opening from the button.
2. **Booking flow** (5 steps on one page, with a progress bar, back button and a sticky bottom summary bar showing price · duration and the primary button):
   - Choose services: multi-select list with name, duration, price, optional category headers and optional service images.
   - Choose a professional: cards with photo or initial, name, title; the first card is "Any professional".
   - Pick a time: a horizontally scrollable date strip (today + 60 days), then time slots grouped Morning / Afternoon / Evening in a 3–4 column grid. States: loading skeleton, empty day ("No free times, pick another date"), error with retry, and a "That time was just taken" notice.
   - Your details: name, email, phone (optional), note (optional), with inline validation errors below fields.
   - Confirmation: date and time as the hero, barber, services, duration, price, "Manage or cancel" and "Book another".
3. **Manage booking page** (opened from the email link, themed to the shop): booking summary with a status pill (Confirmed / Cancelled / Completed), a two-step cancel ("Cancel booking" → "Yes, cancel / Keep it"), a cancelled state, and a "too late to cancel online, call the shop" state.
4. **Confirmation email**: on-brand per shop (logo + accent colour), simple, works without images.
5. **Storefront editor** (described above).
6. **Platform landing page** (for future shops): hero showing the 3 example storefronts, how it works in 3 steps, feature highlights, call to action.
7. **Owner admin (concept only)**: sign-in page, plus a dashboard with today's appointments as a day timeline per barber and quick stats. This gets built in Phase 2, so a direction is enough.

**Motion and scrolling**
- Tasteful, fast and purposeful: scroll-reveal of storefront sections (fade + 8–16px rise), subtle parallax on the hero image, gentle crossfade on the hero carousel (paused on hover/focus, never auto-advancing faster than every 6s), a gallery lightbox, smooth step-to-step transitions in the booking flow (slide/fade ≤ 250ms), a satisfying selection micro-interaction on services and time slots, and the sticky summary bar animating its price when it changes.
- Motion intensity can be part of a preset (e.g. "Minimal" uses less motion than "Bold"), but must always stay within these rules.
- Implementation constraints (please annotate the design with these):
  - Scroll reveals: **CSS scroll-driven animations** (`animation-timeline: view()`) or IntersectionObserver. Zero JavaScript where possible.
  - Interactive and orchestrated motion (step transitions, layout changes, lightbox): the **Motion** library (formerly Framer Motion), loaded with `LazyMotion` + `domAnimation` to keep the bundle small.
  - Animate only `transform` and `opacity`. No scroll-jacking, no smooth-scroll libraries, no autoplay video in the hero.
  - Respect `prefers-reduced-motion`: every animation must have a no-motion fallback, and the carousel must not auto-advance.
  - Provide a motion spec table: element, trigger, property, duration, easing, reduced-motion behaviour.

**Hard requirements**
- Theming must be implementable as **CSS variables set per shop on the server**: no flash of the default theme, and no JavaScript needed to apply a theme. Fonts come from the curated set only (self-hosted, subset, `font-display: swap`), and only the chosen display font loads.
- Performance: LCP < 2.5s on mid-range mobile over 4G, CLS < 0.1, INP < 200ms. Hero image ≤ 150 KB (AVIF/WebP, responsive sizes); gallery images lazy-load. No layout shift when slots or images load (fixed aspect ratios, skeletons).
- Accessibility: WCAG 2.2 AA contrast in both themes and for **every** owner-chosen colour (show the auto-correction rule). Text over photos needs a scrim or overlay that guarantees contrast. Visible focus states. Touch targets ≥ 44px. Selected state never shown by colour alone (use a check icon or weight change). Every image has owner-provided or sensible fallback alt text.
- Robustness: the design must hold up with long shop names, no logo, one photo, 30+ services, 1 or 8 barbers, and German copy (about 30% longer).
- Times are always the shop's local time (Europe/Vienna). Prices are in EUR, formatted like "€ 25,00". Copy is English for now.

**Deliverables**
- Mobile and desktop frames for every screen and state above.
- The 3 example shops.
- The storefront editor.
- A token sheet: platform defaults, the preset definitions, and how tokens derive from an owner's colour choice.
- A component sheet: buttons, hero variants, section blocks, gallery and lightbox, staff card, service row, date chip, time slot, sticky summary bar, form field with error, status pill, announcement banner, skeletons, empty states.
- The motion spec table.
