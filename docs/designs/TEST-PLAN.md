# TEST PLAN: prove every acceptance criterion

## Matrix
- Viewports: **360×740, 390×844, 768×1024, 1280×800, 1440×900** (+ 899 and 900 px wide for the storefront breakpoint, 959/960 for booking).
- Modes: light, dark, and auto (emulate `prefers-color-scheme` both ways).
- Shops: kaiser, fadelab, lune (seed). Plus a "stress" shop: name "Friseursalon Schönheitsoase Margareten am Gürtel", services "Damenhaarschnitt mit Waschen, Föhnen und Pflegekur", 1 professional, 0 photos, accent `#f5e663` (fails contrast on purpose).
- Reduced motion on/off.

## Visual regression (Playwright `toHaveScreenshot`, maxDiffPixelRatio 0.01)
Baseline = `screens/*.jpg` for the 3 demo shops at 390 and 1280 in light and dark. Freeze time to **Thu 8 Oct 2026 11:20 Europe/Vienna**, disable animations (`reducedMotion: 'reduce'`), mock availability to the prototype data (morning 09:00, 09:30, 10:30, 11:00, 12:00; afternoon 14:00, 14:30, 15:30, 16:00, 16:30; evening 17:30, 18:00; Sun/Mon closed).

## Functional tests (one spec per group)

```
storefront.spec.ts
  S-1..S-2   announcement shows, dismiss persists (reload)
  S-3        header data-scrolled after scroll 20px
  S-4        nav click → section top within 64±4px of viewport top
  S-5        mobile menu open/close via button, Esc, link; aria-expanded
  S-7,S-15   book links carry ?service= / ?staff=
  S-10       carousel: advances after 5s; pause stops it; swipe; arrows ≥900; 1 photo → no controls
  S-12       open/closed status with frozen clock: Thu 11:20 → "Open now until 13:00"; Thu 13:30 → "Closed · opens 14:00"; Mon → "Closed · opens Tue 09:00"
  S-13,S-14  section order & visibility per seed
  S-18       lightbox open/arrows/Esc/focus return
  S-24       layout switch at 899 vs 900
booking.spec.ts
  B-1..B-5, B-6..B-9 (incl. 1-staff stress shop), B-10..B-15 (mock 409, 500, empty), B-16..B-19, B-20..B-22, B-23..B-26
manage.spec.ts      G-1..G-7 (freeze clock before/after deadline)
email.spec.ts       render HTML snapshot per shop; E-3 contrast check; text part present
landing.spec.ts     L-1..L-6
theme.spec.ts       T-1..T-10 on every page (toggle data-mode; emulate media)
```

## Accessibility
- `@axe-core/playwright` on every screen/state in both modes: **0 violations**.
- Keyboard-only run of the whole booking flow (Tab/Shift-Tab/Space/Enter/arrows). Focus never lost; visible on every control.
- Screen reader smoke test (VoiceOver iOS + NVDA): step heading announced on step change; totals announced (aria-live polite); 409 alert announced.
- Contrast script: for each theme × mode, assert ≥ 4.5 for (`--foreground`,`--background`), (`--muted`,`--background`), (`--muted`,`--surface`), (`--accent-text`,`--background`), (`--accent-foreground`,`--accent`).

## Performance (Lighthouse CI, mobile)
Storefront each shop: Perf ≥ 90, A11y 100, Best Practices ≥ 95, SEO ≥ 95, LCP < 2.5 s, CLS < 0.02, TBT < 200 ms. JS for storefront route < 70 KB gzip.

## Manual checklist before sign-off
- [ ] Compare each screen side by side with `screens/*.jpg` at 390 and 1280 (spacing, type, colours, copy).
- [ ] Watch every animation in MOTION.md once on a real phone (iOS Safari + Android Chrome) and once with reduced motion.
- [ ] Book end to end on a real phone; receive the email (Gmail + Outlook); add to calendar; cancel from the email link.
- [ ] Stress shop renders without overflow at 320 px.
