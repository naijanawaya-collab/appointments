# BEHAVIOUR: state, data, API, copy, edge cases

## 1. Data model (minimum fields the UI needs)

```ts
type Shop = {
  id: string; slug: string; name: string; short: string; mark: string;      // mark = monogram letter
  themeKey: string;               // preset id: 'classic' | 'modern' | 'soft' | 'minimal' | 'bold' | 'editorial' (demo: kaiser/fadelab/lune map to classic/modern/soft)
  mode: 'light' | 'dark' | 'auto';
  accent: string;                 // owner hex → derive tokens (code/theme.ts)
  hero: 'split' | 'full' | 'carousel' | 'text';
  sections: ('about'|'services'|'team'|'gallery'|'reviews'|'hours'|'location'|'contact')[]; // order = render order
  eyebrow: string; tagline: string; about?: string;
  address: string; geo: { lat: number; lon: number }; phone: string; email: string; domain?: string;
  announcement?: { id: string; tag: string; text: string; until?: string };
  logoUrl?: string;
  media: { hero: Img[]; about?: Img; gallery: Img[] };                       // Img = { src, alt, focal: [x%, y%] }
  serviceImages: boolean;
  rating?: { value: number; count: number };
  reviews: { quote: string; author: string }[];
  cancelLeadHours: number;        // Kaiser 24, FADE/LAB 2, Lune 12
  hours: { day: 0|1|2|3|4|5|6; ranges: [string, string][] }[];               // Europe/Vienna, "09:00"
  closures: { from: string; to: string; label?: string }[];
};
type Category = { id: string; name: string; services: Service[] };
type Service = { id: string; name: string; minutes: number; priceCents: number; description?: string; imageUrl?: string };
type Staff = { id: string; name: string; title: string; bio?: string; photoUrl?: string; serviceIds: string[] };
type Booking = { id: string; token: string; shopId: string; staffId: string; serviceIds: string[]; start: string /*UTC ISO*/;
  minutes: number; priceCents: number; customer: { name: string; email: string; phone?: string; note?: string };
  status: 'confirmed' | 'cancelled' | 'completed' };
```

Seed: `tokens/seed-shops.json` contains the three demo shops exactly as designed (services, prices, staff, hours, Unsplash photo URLs in `media`).

## 2. Booking state machine

```
services ──(≥1 selected)──▶ staff* ──▶ time ──(slot)──▶ details ──(valid)──▶ submitting ──201──▶ done
   ▲                         │           ▲   │                              │
   └──────── Back ───────────┘           │   └─ date change clears slot      ├─409──▶ time (taken alert, slot struck)
                                         └───────────────────────────────────┤
                                                                             └─5xx/network──▶ details (inline error "Something went wrong. Try again.")
* skipped when shop has exactly 1 professional
```
State (client, URL-synced `?step=`): `{ step, serviceIds[], staffId | 'any', date, slot, details{name,email,phone,note}, takenSlots[] }`. Persist to `sessionStorage` (`bk:<shopId>`) so a reload keeps progress; clear on done.

## 3. API contracts

| Method + path | Request | Response | Notes |
| --- | --- | --- | --- |
| `GET /api/shops/:id/availability?date=YYYY-MM-DD&services=a,b&staff=any|id` | | `200 { date, slots: [{ time:"09:00", staffIds:[…] }], nextAvailable?: { date, time } }` | Slots in Vienna local time; empty `slots` + `nextAvailable` drives the empty state |
| `GET /api/shops/:id/days?from=…&to=…` | | `200 { days: [{ date, closed: boolean }] }` | For the 60-day strip |
| `POST /api/bookings` | `{ shopId, serviceIds, staffId|'any', date, time, customer }` + header `Idempotency-Key` | `201 { token, booking }` · `409 { code:'SLOT_TAKEN' }` · `422 { fieldErrors }` | Server assigns staff for 'any' (least booked that day) |
| `GET /api/bookings/:token` | | `200 { booking, shop, canCancel, cancelDeadline }` · `404` | |
| `POST /api/bookings/:token/cancel` | | `200 { booking }` · `409 { code:'TOO_LATE' }` | Server checks deadline |

Concurrency: unique constraint on `(staff_id, start)` overlap (Postgres `EXCLUDE USING gist (staff_id WITH =, tstzrange(start, end) WITH &&)`); the losing insert returns 409.

## 4. Validation & copy (exact strings)

| Field | Rule | Error copy |
| --- | --- | --- |
| Name | trim, 1–80 chars | ! Please enter your name |
| Email | `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | ! Enter a full email address, e.g. name@example.com |
| Phone | optional; 6–20 digits | ! Enter a phone number or leave it empty |
| Note | optional, ≤ 500 chars | ! Keep the note under 500 characters |

Other strings: "Select at least one service" · "Continue" · "Confirm booking" · "Booking confirmed" · "You’re booked at <shop>" · "A confirmation is on its way to <email>." · "Manage or cancel" · "Add to calendar" · "Book another" · "Any professional" / "Earliest available time" · "No free times on <Sat 10 Oct>" · "Couldn’t load times." · "That time was just taken." · Step titles: "Choose services", "Choose a professional", "Pick a time", "Your details".

## 5. Edge cases (all must be handled)

1. Shop with 1 professional → skip step 2 (B-8).
2. Services with no common professional → inline note on step 2 (B-7).
3. Day fully booked → empty state with next free date (B-12).
4. Slot taken between select and submit → 409 path (B-14).
5. Network failure on availability → error state; on submit → inline error, form kept.
6. Booking across a closure → closure days rendered closed in strip.
7. DST change weeks (last Sun of Mar/Oct) → slot times computed in Vienna local, stored UTC.
8. Very long shop names / German service names → wrap, never overflow (test strings in TEST-PLAN.md).
9. No photos at all → hero falls back to "text" layout (eyebrow + H1 + tagline on `--surface` with subtle dot pattern), gallery section hidden.
10. Owner chose a low-contrast accent → `--accent-text` / `--accent-foreground` derived (Design System §04); never fails AA.
11. Cancel after deadline → G-4 / G-7.
12. JavaScript disabled → storefront fully readable, Book now link works (booking requires JS: show "Please enable JavaScript to book" in `<noscript>`).

## 6. Analytics events (fire, don't design)
`storefront_view`, `book_click {source: header|hero|service|team|bar}`, `booking_step {step}`, `booking_submit`, `booking_conflict`, `booking_done`, `booking_cancel`.

## 7. SEO / meta
`<title>` "<Shop> – Book online", description = tagline. OG image 1200 × 630 generated (hero + name + accent, see editor board 4c). JSON-LD `HairSalon`/`BeautySalon` with address, geo, openingHours, priceRange.

## 8. Assets

**Photos**: Unsplash (free license, no attribution required). URLs in `tokens/seed-shops.json → media` and `prototype/shops.js`, form `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&q=70&w=<w>`. Hero 1600–1800 w, gallery 900 w (lightbox 1800 w), portraits 600 w, service thumbs 300 w.
**Icons** (`lucide-react`): `X, Menu, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, Plus, Check, Star, Phone, Navigation, MapPin, MessageCircle, Mail, Instagram, Music2 (TikTok stand-in), CalendarX, CalendarPlus, Clock, AlertCircle`.
**Logo fallback**: monogram tile (first letter, display font, `--accent` bg, `--accent-foreground`, radius `--radius`), 36 px header / 32 px booking.
**Fonts**: Geist 400/500/600/700, Geist Mono 400/500, Cormorant Garamond 500/600, Barlow Condensed 600/700, Italiana 400, Instrument Serif 400, Anton 400.
