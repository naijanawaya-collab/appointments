# Design prompt (for Claude Design)

Paste everything below the line into Claude Design. It describes the product,
the screens that already exist in code, and hard constraints (performance,
accessibility, multi-tenant theming) so the design can be implemented without
rework.

---

Design a sleek, modern booking experience for an online appointment platform for barbershops. One codebase serves many shops; the first is a newly opened barbershop. Customers book on their phone in under a minute; the owner manages everything from a dashboard.

**Brand direction**
- Mood: confident, crafted, calm. Think premium barbershop: warm neutrals (stone, bone, charcoal), one strong accent, generous whitespace, editorial typography. Not "SaaS blue", no gradients-everywhere, no stock-photo clutter.
- Typography: Geist Sans for UI (already installed), optionally one display face for large headings (a condensed grotesk or refined serif). Tabular numbers for prices and times.
- Express everything as design tokens. The code already uses these CSS variables, so keep the names: `--background`, `--foreground`, `--surface`, `--muted`, `--line`, `--accent`, `--accent-foreground`, `--danger`. Provide light **and** dark values.
- **Multi-tenant theming:** each shop must be able to swap `--accent` (and optionally a logo and a hero image) without the design breaking. Show the storefront in two different accent colours to prove it.

**Screens to design (mobile 390px first, then desktop 1280px)**
1. **Shop storefront / booking page**: hero with the shop name, short description, address, opening hours, and a strong "Book now" call to action, followed by the booking flow. Optional sections below: team, gallery, location map, reviews.
2. **Booking flow** (5 steps on one page, with a progress bar, back button and a sticky bottom summary bar showing price · duration and the primary button):
   - Choose services: multi-select list with name, duration, price, optional category headers.
   - Choose a professional: cards with photo or initial, name, title; the first card is "Any professional".
   - Pick a time: a horizontally scrollable date strip (today + 60 days), then time slots grouped Morning / Afternoon / Evening in a 3–4 column grid. States: loading skeleton, empty day ("No free times, pick another date"), error with retry, and a "That time was just taken" notice.
   - Your details: name, email, phone (optional), note (optional), with inline validation errors below fields.
   - Confirmation: date and time as the hero, barber, services, duration, price, "Manage or cancel" and "Book another".
3. **Manage booking page** (opened from the email link): booking summary with a status pill (Confirmed / Cancelled / Completed), a two-step cancel ("Cancel booking" → "Yes, cancel / Keep it"), a cancelled state, and a "too late to cancel online, call the shop" state.
4. **Confirmation email**: simple, on-brand, works without images.
5. **Platform landing page** (for future shops): hero, how it works in 3 steps, feature highlights, call to action.
6. **Owner admin (concept only)**: sign-in page, plus a dashboard with today's appointments as a day timeline per barber and quick stats. This gets built in Phase 2, so a direction is enough.

**Motion and scrolling**
- Tasteful, fast and purposeful: scroll-reveal of storefront sections (fade + 8–16px rise), subtle parallax on the hero image, smooth step-to-step transitions in the booking flow (slide/fade ≤ 250ms), a satisfying selection micro-interaction on services and time slots, and the sticky summary bar animating its price when it changes.
- Implementation constraints (please annotate the design with these):
  - Scroll reveals: **CSS scroll-driven animations** (`animation-timeline: view()`) or IntersectionObserver. Zero JavaScript where possible.
  - Interactive and orchestrated motion (step transitions, layout changes): the **Motion** library (formerly Framer Motion), loaded with `LazyMotion` + `domAnimation` to keep the bundle small.
  - Animate only `transform` and `opacity`. No scroll-jacking, no smooth-scroll libraries, no autoplay video in the hero.
  - Respect `prefers-reduced-motion`: every animation must have a no-motion fallback.
  - Provide a motion spec table: element, trigger, property, duration, easing, reduced-motion behaviour.

**Hard requirements**
- Performance: LCP < 2.5s on mid-range mobile over 4G, CLS < 0.1, INP < 200ms. Hero image ≤ 150 KB (AVIF/WebP). No layout shift when slots load (reserve space with skeletons).
- Accessibility: WCAG 2.2 AA contrast in both themes and for any tenant accent (show the minimum-contrast rule for accents). Visible focus states. Touch targets ≥ 44px. Selected state never shown by colour alone (use a check icon or weight change).
- Times are always the shop's local time (Europe/Vienna). Prices are in EUR, formatted like "€ 25,00".
- Copy is English for now. Keep the layout German-ready, since German strings run about 30% longer.

**Deliverables**
Mobile and desktop frames for every screen and state above, a token sheet (colours light/dark, type scale, spacing, radii, shadows), a component sheet (buttons, service row, staff card, date chip, time slot, sticky summary bar, form field with error, status pill, skeletons), and the motion spec table.
