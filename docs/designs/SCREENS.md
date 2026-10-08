# SCREENS: layout specs + acceptance criteria

Screenshots are in `screens/`. Mobile captures are 390 px wide; desktop captures are 1280 px wide. Each is the full page.
Fonts in captures are exact. Two capture artefacts are **not** defects: the map shows a placeholder (it is a live OSM iframe), and a thin scrollbar can appear in booking captures.

AC IDs are referenced by `TEST-PLAN.md`. "Container" = the component root's inline size (container queries), not the viewport.

---

## 0. Global rules (apply to every screen)

| ID | Criterion |
| --- | --- |
| T-1 | All themed colours come from CSS variables in `tokens/tokens.css`. Switching `data-theme` / `data-mode` on the root re-themes the whole screen with no reload. |
| T-2 | First paint already has the correct theme (server-rendered vars on `<html>`); no flash of the wrong mode when the page loads. |
| T-3 | `data-mode="auto"` follows `prefers-color-scheme` live (toggle the OS setting → page updates without reload). |
| T-4 | Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px display type) in light **and** dark for every theme. Text in the accent colour on the background always uses `--accent-text`, never `--accent`. |
| T-5 | Every interactive element is ≥ 44 × 44 px hit area. Inputs use ≥ 16 px font (no iOS zoom). |
| T-6 | `:focus-visible` shows a 2 px `--foreground` outline with 2 px offset on every control. |
| T-7 | No horizontal page scroll at any width from 320 px to 1920 px. |
| T-8 | Body font Geist; numerals that line up (prices, times, durations) use `font-variant-numeric: tabular-nums`. |
| T-9 | Prices format `€ 32,00` (space after €, comma decimals); durations `40 min`, `1 h`, `1 h 20 min`. |
| T-10 | All motion is disabled under `prefers-reduced-motion: reduce` (see MOTION.md). |

Type & spacing: section headings `font-family: var(--font-display)`, weight `var(--display-weight)`, `text-transform: var(--display-transform)`, `letter-spacing: var(--display-tracking)`. Eyebrows: Geist Mono 500 12 px, letter-spacing .12em, uppercase, `--muted`. Gutter `clamp(16px, 4cqi, 48px)`. Section padding-block `clamp(48px, 8cqi, 120px)`. Sections separated by `1px solid var(--line)` top border.

---

## 1. Storefront (`/[shop]`)

Screens:
- Kaiser & Co. (Classic preset, split hero, 6 staff, 31 services, announcement):
  mobile `sf-kaiser-mobile-light.jpg`, `sf-kaiser-mobile-dark.jpg` · desktop `sf-kaiser-desktop-light.jpg`, `sf-kaiser-desktop-dark.jpg`
- FADE/LAB (Modern preset, full-bleed parallax hero, new shop: no logo, 2 photos, no bios, no reviews, no about):
  `sf-fadelab-mobile-light/dark.jpg`, `sf-fadelab-desktop-light/dark.jpg`
- Lune (Soft preset, carousel hero, service thumbnails, no announcement):
  `sf-lune-mobile-light/dark.jpg`, `sf-lune-desktop-light/dark.jpg`

Breakpoint: **desktop layout when container ≥ 900 px** (nav links visible, carousel arrows visible, hero ratio 21/9, 5 gallery tiles, no mobile book bar, no hamburger).

### 1.1 Announcement bar (optional per shop)
- Full width, `background: var(--foreground)`, `color: var(--background)`, min-height 44 px, font 14/1.35.
- Centered: tag pill (`--accent` bg, `--accent-foreground` text, Geist 600 11 px, uppercase, .06em, padding 3×8, radius 4) + text.
- Right: dismiss button 44 × 44, Lucide `x` 18 px.

| ID | Criterion |
| --- | --- |
| S-1 | Renders only when the shop has an active announcement. |
| S-2 | Dismiss collapses the bar (MOTION M-3) and stays dismissed after reload for that announcement id. |

### 1.2 Header
- Sticky, height 64 → 56 when scrolled (M-2). Background `color-mix(in oklab, var(--background) 90%, transparent)` + blur 12 px.
- Left: logo tile 36 × 36 (radius `--radius`, `--accent` bg, monogram = first letter in `--font-display` 22 px, `--accent-foreground`), or the uploaded logo at 36 px height. Then shop short name (`--font-display`, `clamp(18px, 2.2cqi, 24px)`, ellipsis).
- Desktop: centre nav buttons (Services · Team · Gallery · Visit, only for sections that are enabled), Geist 500 14, `--muted`, hover `--foreground` + 6% tint bg, radius 8, height 44, padding 0 14.
- Right: **Book now** primary button (height 44, padding 0 18, 14/600, radius `--btn-radius`, `text-transform: var(--btn-transform)`). Mobile adds a 44 × 44 hamburger (1 px `--line` border, `--surface` bg, Lucide `menu` ↔ `x` 20 px).

| ID | Criterion |
| --- | --- |
| S-3 | Header stays at the top while scrolling; gets bottom border + shadow after 8 px of scroll. |
| S-4 | Nav click smooth-scrolls to the section with a 64 px offset; section heading is fully visible below the header. |
| S-5 | Hamburger opens a sheet under the header with the nav items (`--font-display` 26 px rows, 56 px tall, arrow-right icon), then Phone and Directions buttons. Esc, tapping a link, or tapping the icon again closes it. `aria-expanded` reflects state. |
| S-6 | Logo/name click scrolls to top. |
| S-7 | Book now links to `/[shop]/book`. |

### 1.3 Hero, by preset (`shop.hero`)
**Split** (Kaiser): grid `repeat(auto-fit, minmax(min(100%, 440px), 1fr))`, gap `clamp(24px, 4cqi, 64px)`, padding gutter. Image box aspect 4/5, max-height 680, `object-fit: cover`, `object-position` = focal point (62% 34%). Text column: eyebrow → H1 (`clamp(44px, 7.4cqi, 96px)`, line-height .98, balance) → tagline (17–20 px, `--muted`, max 44ch) → buttons (Book an appointment + arrow-right icon, height 52, padding 0 26, 16/600; Services & prices secondary: `--surface` bg, 1 px `--line`, hover border `--foreground`) → status row: pulsing green dot + "**Open now** until 19:00" + address (14 px, `--muted`).
**Full-bleed** (FADE/LAB): section min-height `clamp(560px, 62cqi, 780px)`, `#1b1c1f` fallback bg, photo 120% tall with parallax (M-6), scrim `linear-gradient(to top, rgba(0,0,0,.82), rgba(0,0,0,.3) 55%, rgba(0,0,0,.1))`. Bottom-left content, white: eyebrow `#ececea`, H1 `clamp(64px, 13cqi, 176px)` line-height .86, tagline `#f1f1ef`, buttons (Book now 700 uppercase .06em; Prices outline `rgba(255,255,255,.55)`, hover bg 12% white).
**Carousel** (Lune): padding `clamp(12px, 2.5cqi, 32px)`. Slide box aspect 4/5 mobile, 21/9 desktop, max-height 680, radius `--radius`. Bottom scrim 45%. Dots bottom-left, pause bottom-right 44 × 44 (rgba(0,0,0,.45)). Desktop: 48 × 48 white arrows at left/right 16 px. Below: centered eyebrow, H1 `clamp(44px, 7cqi, 92px)`, tagline, Book an appointment.

| ID | Criterion |
| --- | --- |
| S-8 | Hero image is the LCP element: `fetchpriority="high"`, not lazy, has width/height or aspect-ratio (CLS 0). |
| S-9 | Text on photos always sits on the scrim and passes 4.5:1 for body text, 3:1 for the H1. |
| S-10 | Carousel: autoplay 5 s, swipe, dots, arrows (≥ 900 px), pause/play (M-5). With 1 photo, no dots, no pause, no autoplay. Carousel option needs ≥ 3 photos, otherwise falls back to split. |
| S-11 | Long names wrap (`text-wrap: balance`, `hyphens: auto`, German hyphenation with `lang="de"`); no overflow at 320 px. |
| S-12 | Status row: open → green pulsing dot + "Open now until HH:MM"; closed → grey static dot + "Closed · opens Tue 09:00". Never wraps between dot and text. |

### 1.4 Sections (order and visibility from `shop.sections[]`)
**About** (only if text): 2-col auto-fit (min 400 px). Eyebrow "About", H2, paragraph (16–18 px, 1.65, `--muted`, 58ch), image 3/2.
**Services & prices**: eyebrow + H2 "What we do" + right "Prices incl. VAT · Vienna time". Categories in auto-fit grid (min 420 px). Each category: label (Geist 500 12, .1em, uppercase, `--muted`), list with `--line` dividers. Row = link (min-height 44, padding 14 × 8, hover 8% accent tint, radius `--radius × .6`): optional thumbnail 56 × 56 → name 16/500 + meta "40 min · description" 14 `--muted` → price 600 tabular → Lucide `plus` 18 in `--accent-text`. Footer: "Choose services" primary + "See all 31 services" link (`--accent-text`, underline offset 4) when more exist than shown.
**Team**: grid `repeat(auto-fill, minmax(min(46%, 200px), 1fr))`, gap 12–24. Card: 4/5 portrait (radius `--radius`, 1 px `--line`), or initial on `--surface` in `--accent-text` (`--font-display`, `clamp(56px, 8cqi, 96px)`) when no photo. Name 16/600, title 14 `--muted`, optional bio 14/1.5. Whole card links to booking with that professional preselected. Title: "Your barbers" (> 3 staff) / "The crew" / "The hands" (beauty).
**Gallery**: auto-fit grid, tile min 140 px mobile / 200 px desktop / 260 px when ≤ 2 photos. Square tiles (4/5 when 2 photos, 4/3 when 1). Shows 4 (mobile) / 5 (desktop); last tile overlays "+N" (rgba(0,0,0,.55), 600 26 px white). "View all N photos" link top-right when more. ≤ 2 photos: dashed card "More work coming soon / We just opened. Fresh cuts land on Instagram first." + "Follow on Instagram" button.
**Reviews** (only if ≥ 1): `--surface` band. Row: 5 Lucide `star` 16 in `--accent-text` + "4.9 on Google · 212 reviews". Horizontal scroll-snap row of quotes (column width `minmax(min(86%, 460px), 1fr)`), quote in `--font-display` `clamp(24px, 2.8cqi, 36px)`/1.2, caption "Name · Google review".
**Hours & location**: 2-col auto-fit (min 400). Left: eyebrow, H2 "Visit us", open status, holiday notice (`--accent-subtle` bg, Lucide `calendar-x`, "**Holiday hours:** closed 24–26 Dec and 1 Jan."), `<dl>` of 7 days (today bold + "· today", closed days `--muted`). Right: map 4/3 (radius, 1 px `--line`), address with `map-pin`, buttons Directions (`navigation`), phone (`phone`), WhatsApp (`message-circle`).
**Footer**: `--foreground` bg, `--background` text. Shop full name in display font `clamp(32px, 5cqi, 64px)`; round 44 px social buttons (instagram, music-2 for TikTok, message-circle) + email pill (`mail`); bottom row "Impressum · Privacy" / "Booking by Appointments" at 75% opacity. Bottom padding 104 px on mobile (room for the book bar).
**Mobile book bar** (< 900 px): sticky bottom, "Next free: today 15:30" (600 14) + "Book online in under a minute" (13 `--muted`) + Book now (height 48). Slides in after 60% viewport scroll (M-10).

| ID | Criterion |
| --- | --- |
| S-13 | Sections render in the owner's order; disabled sections are absent from DOM and nav. |
| S-14 | About is hidden when empty (FADE/LAB). Reviews hidden when 0 reviews (FADE/LAB). |
| S-15 | Every service row and team card navigates to booking with that service / professional preselected (`?service=<id>` / `?staff=<id>`). |
| S-16 | Service thumbnails render only for shops that enabled service images (Lune). |
| S-17 | Staff without photo show the initial tile; all cards in a row share the same image height. |
| S-18 | Gallery tile opens the lightbox at that photo (M-9). "+N" tile opens at that index. |
| S-19 | ≤ 2 photos layout + "More work coming soon" card (FADE/LAB). |
| S-20 | Hours: today highlighted; closed days muted; times tabular; holiday notice appears only when a closure is within 30 days. |
| S-21 | Map iframe lazy-loads with a `title` ("Map showing <address>"); Directions opens Google Maps directions in a new tab; phone is `tel:`; WhatsApp `wa.me/<digits>`. |
| S-22 | Footer and bar never cover content: last content is fully visible above the bar at the end of the page. |
| S-23 | Images below the fold are `loading="lazy"` with explicit aspect ratio. |
| S-24 | Desktop (≥ 900) vs mobile differences exactly as listed above; check at 899 and 900 px. |
| S-25 | Dark mode: footer inverts (light band) as in `sf-*-desktop-dark.jpg`; photos are unchanged. |

---

## 2. Booking flow (`/[shop]/book`)

Screens: FADE/LAB mobile dark `bk-fadelab-mobile-{services,staff,time,details,done}.jpg` · Lune desktop light `bk-lune-desktop-{services,staff,time,details,done}.jpg` · Kaiser mobile states `bk-kaiser-mobile-staff.jpg` (6 professionals), `bk-kaiser-mobile-time-{loading,empty,error,taken}.jpg`, `bk-kaiser-mobile-details-errors.jpg` · Kaiser desktop dark `bk-kaiser-desktop-time-dark.jpg`.

Layout: full viewport height. Header 60 px (Back 44 × 44 with `arrow-left` from step 2; logo tile 32 + name 19 px; "Step N of 4" 13 px `--muted` right; hidden on confirmation). Body: mobile single column with padding 16 and bottom padding 120 (bar). **Desktop (container ≥ 960 px):** grid `minmax(0,1fr) 360px`, gap up to 56, the right aside is a sticky summary card (top 40, radius `--radius-lg`, `--surface`, 22 padding): "Your booking", items (name + duration, price), With / When, Total · duration + total 22/600, primary button (52 tall). Mobile has a fixed bottom bar instead: total 18/600 + "1 h · 2 services" 13 `--muted` (aria-live polite) + button (52 tall, padding 0 26). Progress: 4 segments, 4 px tall, gap 6, filled `--accent` up to current step, rest `--line`. Step title `clamp(24px, 5.6cqi, 32px)` 600 −.02em, focusable (`tabindex=-1`).

### Step 1: Services
Category chips row (36 px pills; active = `--foreground` bg / `--background` text). Per category: label + list in one card (radius `--radius-lg`, 1 px `--line`, `--surface`). Row = `<button aria-pressed>` min-height 64, padding 14 × 16: optional 52 px thumbnail → name 16 (600 when selected) + meta → price → 28 px check circle (unselected: 1.5 px `--line` border, "+" `--muted`; selected: `--accent` fill, "✓" `--accent-foreground`). Selected row: `--accent-subtle` bg + `inset 3px 0 0 var(--accent)`.

| ID | Criterion |
| --- | --- |
| B-1 | Multiple services selectable; toggling updates total price + duration instantly (bar/aside). |
| B-2 | Continue disabled (`--line` bg, `--muted` text, `aria-disabled`) until ≥ 1 service; bar shows "Select at least one service". |
| B-3 | Preselected service from `?service=` is selected on load. |
| B-4 | Chip tap scrolls to that category; active chip follows scroll (IntersectionObserver). |
| B-5 | Check animation per M-12. |

### Step 2: Professional
Radiogroup grid `repeat(auto-fill, minmax(min(46%, 180px), 1fr))`, gap 10. Card 14 padding, radius `--radius-lg`, `--surface`; selected = 2 px `--accent` border + 24 px check badge top-right. Avatar 56 round: photo, or initial on `--foreground`. First card always **Any professional** (avatar `--accent-subtle` bg with ✦ in `--accent-text`, subtitle "Earliest available time").

| ID | Criterion |
| --- | --- |
| B-6 | Default selection is "Any professional". Arrow keys move selection (radiogroup pattern). |
| B-7 | Only professionals who offer **all** selected services are listed. If none does, show an inline note "No single professional offers all of these. Book them separately or go back." + Go back button. |
| B-8 | Shop with 1 professional skips this step entirely; progress shows 3 segments and "Step N of 3". |
| B-9 | `?staff=` preselects and the step is still shown (user can change). |

### Step 3: Time
Month label + "Vienna time". Date strip: horizontally scrollable (scroll-snap, hidden scrollbar), 60 × 72 day buttons (radius `--radius-lg`): weekday 12, day number 20/600 tabular, "Oct" 11. Today labelled "Today". Selected = `--accent` bg. Closed day = dashed border, struck-through number, "Closed", `--muted`, `aria-disabled`. Slots grouped Morning / Afternoon / Evening (label style as category), grid `repeat(auto-fill, minmax(84px, 1fr))`, gap 8, 48 tall, radius `calc(var(--radius) * .6 + 4px)`, `--surface` + 1 px `--line`; selected = `--accent` fill + "✓ 10:30" 700.

States:
- **Loading** (`bk-kaiser-mobile-time-loading.jpg`): skeleton labels 90 × 12 + 8 slot skeletons (48 tall) with M-13 pulse; `aria-busy`.
- **Empty day** (`…-empty.jpg`): dashed card, clock icon in 48 circle, "No free times on Sat 10 Oct", "Please pick another date. The next free time is Tue 13 Oct at 09:30.", button "Jump to Tue 13 Oct".
- **Error** (`…-error.jpg`): card with "Couldn’t load times." (`--danger`), "Check your connection and try again. Your selection is kept.", Try again (`--foreground` button).
- **Slot taken / 409** (`…-taken.jpg`): alert banner at top (1 px `--danger`, 8% danger tint, "!" badge): "**That time was just taken.** Someone booked 10:30 a moment ago. Your services and details are saved, pick another time." The taken slot renders dashed + struck, not selectable.

| ID | Criterion |
| --- | --- |
| B-10 | Date strip covers today + 60 days; closed days not selectable; first open day auto-selected. |
| B-11 | Slots load per date with the loading state shown after 150 ms (no flash for fast responses). |
| B-12 | Empty and error states as specified; "Jump to" selects that date; Try again refetches. |
| B-13 | Selecting a slot enables Continue. Changing date clears the slot. |
| B-14 | On 409 from `POST /bookings`, return to this step with the alert, mark the slot taken, keep services, professional and details. Alert has `role="alert"`. |
| B-15 | Times are shown in Europe/Vienna regardless of the device time zone. |

### Step 4: Details
Fields (labels 14/500 above, 6 gap; inputs 50 tall, radius `calc(var(--radius) * .6 + 4px)`, `--surface`, 1 px `--line`, focus border `--accent` + 3 px `--accent-subtle` ring): **Name** (required), **Email** (required, helper "We’ll send your confirmation here."), **Phone (optional)** prefilled "+43", **Note for the barber/artist (optional)** textarea 88 tall. Consent line 13 `--muted`: "By booking you agree that <shop> stores your details to manage this appointment." Button label **Confirm booking**.

| ID | Criterion |
| --- | --- |
| B-16 | Validate on blur and on submit. Errors (`bk-kaiser-mobile-details-errors.jpg`): 1.5 px `--danger` border + message under the field ("! Please enter your name", "! Enter a full email address, e.g. name@example.com"); first invalid field focused; `aria-invalid` + `aria-describedby`. |
| B-17 | Email regex: `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`. Phone optional; if present 6–20 digits after stripping spaces. |
| B-18 | Confirm shows a spinner in the button and disables it; double-submit impossible (idempotency key). |
| B-19 | Fields keep values when navigating Back and forward again. |

### Step 5: Confirmation
Card: accent header (24 × 22 padding): "✓ You’re booked at <shop>" (check in a 22 circle with pop-in M-14), time in display font `clamp(40px, 10cqi, 64px)`, date 18/500. Then `<dl>` rows: With · Services · Duration · Price (600) · Where. Text: "A confirmation is on its way to <email>." Buttons: Manage or cancel (→ manage page), Add to calendar (calendar-plus, downloads .ics), Book another (link style, resets the flow).

| ID | Criterion |
| --- | --- |
| B-20 | With "Any professional", the confirmation shows the assigned person. |
| B-21 | .ics opens in Apple/Google Calendar with correct Vienna time and duration (`code/booking-utils.ts → icsFile`). |
| B-22 | Browser Back from confirmation does not resubmit; it goes to the storefront. |

### Flow-wide
| ID | Criterion |
| --- | --- |
| B-23 | Step changes animate (M-11), scroll to top and move focus to the step heading. |
| B-24 | Back keeps every earlier choice. The browser Back button maps to step Back (URL `?step=`). |
| B-25 | Bar / aside totals always equal the sum of selected services. |
| B-26 | Desktop ≥ 960 px shows the aside and no bottom bar; < 960 the opposite. |

---

## 3. Manage booking (`/[shop]/b/[token]`)

Screens: `mb-lune-mobile-{confirmed,confirming,cancelled,toolate,completed}.jpg`, `mb-kaiser-desktop-confirmed.jpg`, `mb-kaiser-desktop-cancelled.jpg`.
Layout: header 60 (logo + name). Main max-width 600, centred, padding `clamp(24px,5cqi,64px)` 16–24. Title "Your booking" + status pill (Confirmed: 14% `--success` tint, `--success` text, ✓; Cancelled: 12% `--danger` tint, ×; Completed: `--line` bg). Card: time in display font `clamp(40px,10cqi,60px)`, date 18/500, "Vienna time"; then `<dl>` With · Services · Duration · Price · Where.

| ID | Criterion |
| --- | --- |
| G-1 | Confirmed: Add to calendar, Directions ↗, **Cancel booking** (outline `--danger`). Below: "Free online cancellation until Thu 8 Oct, 22:30 (12 h before)." computed as start − `lead` hours (`cancelDeadline()`). |
| G-2 | Cancel opens an inline confirm panel (`role="alertdialog"`, 1.5 px `--danger` border, 6% tint): "Cancel this appointment?" / "Your time will be released to other customers. This can’t be undone." + **Yes, cancel** (solid `--danger`, white) + Keep it. Focus moves to Keep it. M-15. |
| G-3 | Yes, cancel → `POST /bookings/:token/cancel` → Cancelled state: pill red, card at 70% opacity, time struck through, status panel "This booking has been cancelled." / "A confirmation email is on its way. Nothing to pay." + Book a new time. |
| G-4 | After the deadline: no cancel button; panel "Too late to cancel online" / "Online cancellation closes N hours before your appointment. Please call the shop, they’ll sort it out." + Call <phone> (primary) + WhatsApp. |
| G-5 | Past appointment → Completed pill + "Book again" + "Thanks for visiting <shop>." |
| G-6 | Invalid/expired token → 404 page in platform theme with "This link isn’t valid anymore." + link to the shop. |
| G-7 | Server re-checks the deadline on cancel (client clock is not trusted); a late cancel returns 409 → show the "too late" state. |

---

## 4. Confirmation email (`booking-emails.ts`)

Screens: `em-kaiser.jpg`, `em-fadelab.jpg`, `em-lune.jpg`, `em-kaiser-noimages.jpg`.
600 px max, table-based, all styles inline, **hex colours only** (no CSS variables, no web fonts; display text uses `Georgia, 'Times New Roman', serif`; body `Helvetica, Arial, sans-serif`). Header band = shop accent (Kaiser #7a5c25, FADE/LAB #16171a, Lune #a3456b) with white logo tile + name. Body: "Hi Lukas, you’re booked." / time 44 px Georgia / date 18/600 / table rows (With, Services, Duration · Price, Where) / button "Manage or cancel booking" (accent bg, white, radius 6, padding 14 × 22) / cancellation note / grey footer (#f6f5f3) with shop address and "Sent by Appointments on behalf of <shop>."

| ID | Criterion |
| --- | --- |
| E-1 | Renders correctly in Gmail web/iOS/Android, Apple Mail, Outlook 365 (Litmus or Email on Acid). |
| E-2 | Images off: logo replaced by alt text; layout intact (`em-kaiser-noimages.jpg`). |
| E-3 | Accent used for header/button must reach 4.5:1 with white; if the shop accent fails, use the darkened `--accent-text` value. |
| E-4 | Plain-text alternative part included with the same content. |
| E-5 | Manage link uses the booking token; .ics attached. |
| E-6 | Subject: "Booked: <Service> at <Shop>, <Fri 9 Oct, 10:30>". From name = shop short name. |
| E-7 | Cancellation email uses the same template with title "Your booking is cancelled" and no manage button. |
| E-8 | Dark-mode clients: colours do not invert badly (use `color-scheme: light only` meta + solid backgrounds). |
| E-9 | Width scales down to 320 px without horizontal scroll. |
| E-10 | All times Europe/Vienna. |

---

## 5. Platform landing (`/`)

Screens: `ld-desktop-light.jpg`, `ld-desktop-dark.jpg`, `ld-mobile-light.jpg`, `ld-mobile-dark.jpg`. Theme `platform` (Instrument Serif + Geist, accent #a8431f / dark #e2805a).
Sections: sticky header (wordmark "Appointments" Instrument Serif 26; desktop nav Examples · How it works · Features · Sign in; primary "Open your storefront") → hero (eyebrow, H1 `clamp(48px, 8.4cqi, 120px)`/.95 max 14ch "Your shop, your look. Booked in a minute.", lead, 2 buttons, row of 3 live storefront phones (Kaiser, FADE/LAB, Lune) at `clamp(180px, 22cqi, 280px)` wide, middle one raised 48 px, captions) → How it works (3 numbered columns, 1 px top rule) → Features (6 cells in a 1 px `--line` grid, `--surface` band) → closing CTA → footer.

| ID | Criterion |
| --- | --- |
| L-1 | Phone previews are real storefront renders (static screenshots generated at build time are acceptable), not illustrations. |
| L-2 | Nav anchors smooth-scroll with header offset (`scroll-margin-top: 80px`). |
| L-3 | Scroll reveal on headings, steps and feature cells (M-1). |
| L-4 | "See a live demo" → `/kaiser` (demo shop). "Open your storefront" → sign-up. "Sign in" → `/login`. |
| L-5 | Mobile: phones row scrolls horizontally if needed; no page overflow. |
| L-6 | Dark mode per `ld-*-dark.jpg`. |

---

## 6. Phase 2: Storefront editor (owner)
Screens: `ed-colours-desktop.jpg` (colours step with contrast warning + one-click fix), `ed-sections-upload-desktop.jpg` (drag-to-reorder sections + photo dialog: crop presets, focal point, alt text, upload progress, size/quality errors), `ed-mobile-sheets.jpg` (mobile bottom sheet: presets, hero layout, publish + share image). Full behaviour in `prototype/Editor, Landing & Admin.dc.html` (boards 4a–4c) and Design System §04 (accent derivation). Key ACs:
- ED-1 Live preview updates ≤ 100 ms after any change by swapping CSS variables on the preview root.
- ED-2 Contrast warning appears when the accent needs > 0.15 OKLCH lightness change to reach 4.5:1; "Fix it" applies the computed `--accent-text`.
- ED-3 Sections reorder by drag and by keyboard (Space lift, ↑/↓, Space drop); Hero first and Book button always on (not draggable).
- ED-4 Upload: max 10 MB, JPEG/PNG/HEIC/WebP; < 1600 px wide flagged for hero; progress shown; alt text required for publish (fallback "Inside <shop>").

## 7. Phase 2: Admin
Screens: `admin-signin.jpg` (desktop split + mobile dark loading state, error "Email or password is incorrect."), `admin-dashboard.jpg` (desktop day timeline per barber with now-line, mobile list + bottom tab bar). Direction only; build when scoped.
